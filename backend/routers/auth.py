from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from database import get_db
from utils import serialize_doc
from slowapi import Limiter
from slowapi.util import get_remote_address
import os
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
limiter = Limiter(key_func=get_remote_address)

SECRET = os.getenv("JWT_SECRET", "fab_finance_secret_key_2024")
ALGO = "HS256"
EXPIRE_DAYS = 30

# Validate JWT secret in production
if os.getenv("RENDER") or os.getenv("ENV") == "production":
    if not os.getenv("JWT_SECRET") or SECRET == "fab_finance_secret_key_2024":
        raise ValueError(
            "🔴 SECURITY ERROR: JWT_SECRET must be set to a secure random value in production! "
            "In Render: Dashboard → your backend service → Environment → add JWT_SECRET. "
            "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
        )

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash password with bcrypt.
    Truncates to 72 bytes to avoid bcrypt limitations.
    """
    password_bytes = password.encode('utf-8')[:72]
    return pwd.hash(password_bytes.decode('utf-8', errors='ignore'))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hashed password.
    Truncates to 72 bytes to match hashing behavior.
    """
    password_bytes = plain_password.encode('utf-8')[:72]
    return pwd.verify(password_bytes.decode('utf-8', errors='ignore'), hashed_password)

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_EMAIL)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "")


def _is_production() -> bool:
    return bool(os.getenv("RENDER") or os.getenv("ENV") == "production")


def _format_from_address() -> str:
    sender = (SENDER_EMAIL or SMTP_EMAIL).strip()
    if not sender:
        return ""
    return f"FIN TRACKER <{sender}>"


def _build_otp_html(otp: str, name: str) -> str:
    return f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#f4f4f5;">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size:28px; letter-spacing:-0.5px;">💰 FIN TRACKER</h1>
        <p style="color: rgba(255,255,255,0.8); margin-top: 8px; font-size:14px;">AI-Powered Financial Advisor & Budget Planner</p>
    </div>

    <div style="padding: 32px; background: #ffffff; border-radius: 16px; margin-top: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <h2 style="color: #09090b; margin:0 0 8px;">Hi {name} 👋</h2>
        <p style="color: #71717a; font-size: 15px; line-height:1.6;">
            Welcome to FIN TRACKER! Please use the code below to verify your email address.
            This code is valid for <strong>10 minutes</strong>.
        </p>

        <div style="background: #f4f4f5; padding: 28px; border-radius: 12px; text-align: center; margin: 28px 0;">
            <p style="color: #71717a; font-size: 12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px;">Your verification code</p>
            <h1 style="color: #6366f1; font-size: 52px; letter-spacing: 14px; margin: 0; font-weight:800;">{otp}</h1>
            <p style="color: #a1a1aa; font-size: 12px; margin-top: 12px;">Do not share this code with anyone</p>
        </div>

        <p style="color: #a1a1aa; font-size: 13px;">If you didn't create a FIN TRACKER account, you can safely ignore this email.</p>
    </div>

    <div style="text-align: center; margin-top: 20px; color: #a1a1aa; font-size: 12px;">
        <p>© 2026 FIN TRACKER. All rights reserved.</p>
    </div>
</body>
</html>
"""


def _send_via_resend(to_email: str, subject: str, html: str) -> None:
    import httpx

    if not RESEND_API_KEY:
        raise ValueError("RESEND_API_KEY not configured")

    from_address = RESEND_FROM_EMAIL or _format_from_address()
    if not from_address:
        raise ValueError("No sender address configured for Resend")

    response = httpx.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_address,
            "to": [to_email],
            "subject": subject,
            "html": html,
        },
        timeout=15.0,
    )
    if response.status_code not in (200, 201):
        raise RuntimeError(f"Resend API error ({response.status_code}): {response.text}")


def _send_smtp(to_email: str, subject: str, html: str) -> None:
    msg = MIMEMultipart()
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))

    print(f"[OTP] [STATUS] Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15) as server:
        print("[OTP] [STATUS] Starting TLS...")
        server.starttls()
        print(f"[OTP] [STATUS] Logging in as {SMTP_EMAIL}...")
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        print(f"[OTP] [STATUS] Sending email to {to_email}...")
        server.send_message(msg)
        print(f"[OTP] [SUCCESS] SMTP send completed for {to_email}")


# ─── Request Models ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendOTPRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str


# ─── Helpers ─────────────────────────────────────────────────────

def make_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": exp}, SECRET, algorithm=ALGO)


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))


async def send_otp_email(email: str, otp: str, name: str = "User") -> tuple[bool, str]:
    """Send OTP via Resend API (Render-friendly) or SMTP (Brevo/Gmail)."""
    import asyncio

    print(f"[OTP] [BACKUP] Backup OTP for {email}: {otp}")

    subject = "FIN TRACKER – Email Verification Code"
    html = _build_otp_html(otp, name)
    loop = asyncio.get_event_loop()
    errors: list[str] = []

    if RESEND_API_KEY:
        try:
            await asyncio.wait_for(
                loop.run_in_executor(None, lambda: _send_via_resend(email, subject, html)),
                timeout=20.0,
            )
            print(f"[OTP] [SUCCESS] Email sent via Resend to {email}")
            return True, "Email sent successfully"
        except Exception as e:
            err_msg = f"Resend failed: {e}"
            print(f"[OTP] [ERROR] {err_msg}")
            errors.append(err_msg)

    if SMTP_EMAIL and SMTP_PASSWORD:
        try:
            await asyncio.wait_for(
                loop.run_in_executor(None, lambda: _send_smtp(email, subject, html)),
                timeout=20.0,
            )
            print(f"[OTP] [SUCCESS] Email sent via SMTP to {email}")
            return True, "Email sent successfully"
        except asyncio.TimeoutError:
            err_msg = (
                f"SMTP timeout connecting to {SMTP_SERVER}:{SMTP_PORT}. "
                "On Render, SMTP ports may be blocked — set RESEND_API_KEY instead."
            )
            print(f"[OTP] [TIMEOUT] {err_msg}")
            errors.append(err_msg)
        except smtplib.SMTPAuthenticationError as e:
            err_msg = f"SMTP authentication failed: {e}"
            print(f"[OTP] [ERROR] {err_msg}")
            errors.append(err_msg)
        except Exception as e:
            err_msg = f"SMTP failed: {e}"
            print(f"[OTP] [ERROR] {err_msg}")
            errors.append(err_msg)

    if not RESEND_API_KEY and not (SMTP_EMAIL and SMTP_PASSWORD):
        err_msg = "Email not configured. Set RESEND_API_KEY or SMTP credentials."
        print(f"[OTP] [EMAIL] {err_msg}")
        if _is_production():
            return False, err_msg
        return True, "Email not configured, console backup only."

    combined = "; ".join(errors) if errors else "Email delivery failed"
    return False, combined


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=[ALGO])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    from bson import ObjectId
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return serialize_doc(user)


# ─── Routes ──────────────────────────────────────────────────────

@router.post("/register")
@limiter.limit("5/hour")  # 5 registration attempts per hour per IP
async def register(request: Request, req: RegisterRequest):
    db = get_db()

    # Check if email is already a verified user
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    hashed = hash_password(req.password)

    # Upsert pending registration (replace if same email retries)
    await db.pending_registrations.update_one(
        {"email": req.email.lower()},
        {
            "$set": {
                "name": req.name.strip(),
                "email": req.email.lower().strip(),
                "password": hashed,
                "otp": otp,
                "otp_expiry": otp_expiry,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )

    success, err_msg = await send_otp_email(req.email, otp, req.name.strip())
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to send verification code: {err_msg}")

    return {"status": "otp_sent", "message": "Verification code sent to your email"}


@router.post("/verify-otp")
@limiter.limit("10/hour")  # 10 OTP verification attempts per hour
async def verify_otp(request: Request, req: VerifyOTPRequest):
    db = get_db()

    pending = await db.pending_registrations.find_one({"email": req.email.lower()})
    if not pending:
        raise HTTPException(
            status_code=404,
            detail="No pending registration found. Please register first."
        )

    if datetime.utcnow() > pending["otp_expiry"]:
        await db.pending_registrations.delete_one({"email": req.email.lower()})
        raise HTTPException(status_code=400, detail="OTP has expired. Please register again.")

    if pending["otp"] != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check your email.")

    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        await db.pending_registrations.delete_one({"email": req.email.lower()})
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "name": pending["name"],
        "email": pending["email"],
        "password": pending["password"],
        "email_verified": True,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    user_id = str(result.inserted_id)

    await db.pending_registrations.delete_one({"email": req.email.lower()})

    token = make_token(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "name": doc["name"], "email": doc["email"]},
    }


@router.post("/resend-otp")
@limiter.limit("3/hour")  # 3 OTP resend attempts per hour
async def resend_otp(request: Request, req: ResendOTPRequest):
    db = get_db()

    pending = await db.pending_registrations.find_one({"email": req.email.lower()})
    if not pending:
        raise HTTPException(
            status_code=404,
            detail="No pending registration found. Please register first."
        )

    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)

    await db.pending_registrations.update_one(
        {"email": req.email.lower()},
        {"$set": {"otp": otp, "otp_expiry": otp_expiry}},
    )

    success, err_msg = await send_otp_email(req.email, otp, pending.get("name", "User"))
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to resend verification code: {err_msg}")

    return {"status": "otp_sent", "message": "New verification code sent to your email"}


@router.post("/login")
@limiter.limit("10/hour")  # 10 login attempts per hour per IP
async def login(request: Request, req: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("password") or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    await db.login_otps.update_one(
        {"email": req.email.lower()},
        {
            "$set": {
                "email": req.email.lower().strip(),
                "otp": otp,
                "otp_expiry": otp_expiry,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )
    
    success, err_msg = await send_otp_email(req.email, otp, user.get("name", "User"))
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to send verification code: {err_msg}")
    
    return {"status": "otp_sent", "message": "Verification code sent to your email"}


@router.post("/login-verify")
@limiter.limit("10/hour")
async def login_verify(request: Request, req: VerifyOTPRequest):
    db = get_db()
    
    login_otp = await db.login_otps.find_one({"email": req.email.lower()})
    if not login_otp:
        raise HTTPException(
            status_code=404,
            detail="No OTP found. Please request a new one."
        )
    
    if datetime.utcnow() > login_otp["otp_expiry"]:
        await db.login_otps.delete_one({"email": req.email.lower()})
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    if login_otp["otp"] != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check your email.")
    
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    await db.login_otps.delete_one({"email": req.email.lower()})
    
    user_id = str(user["_id"])
    token = make_token(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "name": user["name"], "email": user["email"]},
    }


@router.post("/login-resend")
@limiter.limit("3/hour")
async def login_resend(request: Request, req: ResendOTPRequest):
    db = get_db()
    
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    await db.login_otps.update_one(
        {"email": req.email.lower()},
        {"$set": {"otp": otp, "otp_expiry": otp_expiry}},
        upsert=True,
    )
    
    success, err_msg = await send_otp_email(req.email, otp, user.get("name", "User"))
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to resend verification code: {err_msg}")
    
    return {"status": "otp_sent", "message": "New verification code sent to your email"}


@router.post("/forgot-password")
@limiter.limit("5/hour")  # 5 password reset attempts per hour
async def forgot_password(request: Request, req: ResendOTPRequest):
    db = get_db()
    
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        return {"status": "otp_sent", "message": "If this email exists, you'll receive a password reset code"}
    
    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    await db.password_resets.update_one(
        {"email": req.email.lower()},
        {
            "$set": {
                "email": req.email.lower().strip(),
                "otp": otp,
                "otp_expiry": otp_expiry,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )
    
    success, err_msg = await send_otp_email(req.email, otp, user.get("name", "User"))
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to send password reset code: {err_msg}")
    
    return {"status": "otp_sent", "message": "Password reset code sent to your email"}


@router.post("/reset-password-verify")
@limiter.limit("10/hour")
async def reset_password_verify(request: Request, req: VerifyOTPRequest):
    db = get_db()
    
    reset_request = await db.password_resets.find_one({"email": req.email.lower()})
    if not reset_request:
        raise HTTPException(
            status_code=404,
            detail="No password reset request found. Please request a new one."
        )
    
    if datetime.utcnow() > reset_request["otp_expiry"]:
        await db.password_resets.delete_one({"email": req.email.lower()})
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    if reset_request["otp"] != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check your email.")
    
    reset_token = make_token(req.email.lower())
    
    await db.password_resets.update_one(
        {"email": req.email.lower()},
        {"$set": {"verified": True, "reset_token": reset_token}}
    )
    
    return {
        "status": "verified",
        "reset_token": reset_token,
        "message": "OTP verified. You can now reset your password."
    }


@router.post("/reset-password-complete")
@limiter.limit("5/hour")
async def reset_password_complete(request: Request, req: ResetPasswordRequest):
    db = get_db()
    
    reset_request = await db.password_resets.find_one({
        "email": req.email.lower(),
        "verified": True,
        "reset_token": req.reset_token
    })
    
    if not reset_request:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token. Please start the password reset process again."
        )
    
    if datetime.utcnow() > reset_request["otp_expiry"]:
        await db.password_resets.delete_one({"email": req.email.lower()})
        raise HTTPException(
            status_code=400,
            detail="Reset token expired. Please request a new password reset."
        )
    
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    hashed_password = hash_password(req.new_password)
    result = await db.users.update_one(
        {"email": req.email.lower()},
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.password_resets.delete_one({"email": req.email.lower()})
    
    return {
        "status": "success",
        "message": "Password reset successfully. You can now login with your new password."
    }


@router.post("/forgot-password-resend")
@limiter.limit("3/hour")
async def forgot_password_resend(request: Request, req: ResendOTPRequest):
    db = get_db()
    
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        return {"status": "otp_sent", "message": "If this email exists, you'll receive a password reset code"}
    
    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    await db.password_resets.update_one(
        {"email": req.email.lower()},
        {"$set": {"otp": otp, "otp_expiry": otp_expiry}},
        upsert=True,
    )
    
    success, err_msg = await send_otp_email(req.email, otp, user.get("name", "User"))
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to resend password reset code: {err_msg}")
    
    return {"status": "otp_sent", "message": "New password reset code sent to your email"}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {"user": {k: v for k, v in current_user.items() if k != "password"}}


@router.get("/health-check")
async def health_check():
    """Health check endpoint to verify email configuration"""
    return {
        "status": "ok",
        "resend_configured": bool(RESEND_API_KEY),
        "smtp_configured": bool(SMTP_EMAIL and SMTP_PASSWORD),
        "sender_email": SENDER_EMAIL or "not configured",
        "smtp_server": SMTP_SERVER,
        "smtp_port": SMTP_PORT,
    }
