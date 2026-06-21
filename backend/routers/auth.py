from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from database import get_db
from utils import serialize_doc
import os
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()
bearer = HTTPBearer(auto_error=False)

SECRET = os.getenv("JWT_SECRET", "fab_finance_secret_key_2024")
ALGO = "HS256"
EXPIRE_DAYS = 30

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash password with bcrypt.
    Truncates to 72 bytes to avoid bcrypt limitations.
    """
    # Bcrypt has a 72-byte limit, truncate if necessary
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


# ─── Helpers ─────────────────────────────────────────────────────

def make_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": exp}, SECRET, algorithm=ALGO)


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))


async def send_otp_email(email: str, otp: str, name: str = "User"):
    """Send OTP via email. Falls back to console print if SMTP not configured."""
    try:
        if not SMTP_EMAIL or not SMTP_PASSWORD:
            print(f"[OTP] Email not configured. OTP for {email}: {otp}")
            return True

        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = email
        msg['Subject'] = "FAB Finance – Email Verification Code"

        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#f4f4f5;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size:28px; letter-spacing:-0.5px;">💰 FAB Finance</h1>
                <p style="color: rgba(255,255,255,0.8); margin-top: 8px; font-size:14px;">Your Personal Finance Manager</p>
            </div>

            <div style="padding: 32px; background: #ffffff; border-radius: 16px; margin-top: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
                <h2 style="color: #09090b; margin:0 0 8px;">Hi {name} 👋</h2>
                <p style="color: #71717a; font-size: 15px; line-height:1.6;">
                    Welcome to FAB Finance! Please use the code below to verify your email address.
                    This code is valid for <strong>10 minutes</strong>.
                </p>

                <div style="background: #f4f4f5; padding: 28px; border-radius: 12px; text-align: center; margin: 28px 0;">
                    <p style="color: #71717a; font-size: 12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px;">Your verification code</p>
                    <h1 style="color: #6366f1; font-size: 52px; letter-spacing: 14px; margin: 0; font-weight:800;">{otp}</h1>
                    <p style="color: #a1a1aa; font-size: 12px; margin-top: 12px;">Do not share this code with anyone</p>
                </div>

                <p style="color: #a1a1aa; font-size: 13px;">If you didn't create a FAB Finance account, you can safely ignore this email.</p>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #a1a1aa; font-size: 12px;">
                <p>© 2026 FAB Finance. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)

        print(f"[OTP] Email sent to {email}")
        return True
    except Exception as e:
        print(f"[OTP] Failed to send email: {str(e)}")
        print(f"[OTP] *** OTP for {email}: {otp} ***")  # Console fallback
        return True  # Don't block registration if email fails


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
async def register(req: RegisterRequest):
    """
    Step 1 of signup: validate data, store a pending registration,
    and send a 6-digit OTP to the user's email.
    Returns {status: "otp_sent"} — the account is NOT created yet.
    """
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

    # Send OTP email (falls back to console if SMTP not configured)
    await send_otp_email(req.email, otp, req.name.strip())

    return {"status": "otp_sent", "message": "Verification code sent to your email"}


@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    """
    Step 2 of signup: verify the 6-digit OTP.
    On success, creates the user account and returns a JWT token.
    """
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

    # OTP is valid — create the real user account
    # Double-check no one registered in the meantime
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

    # Clean up pending registration
    await db.pending_registrations.delete_one({"email": req.email.lower()})

    token = make_token(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "name": doc["name"], "email": doc["email"]},
    }


@router.post("/resend-otp")
async def resend_otp(req: ResendOTPRequest):
    """Resend a fresh OTP to the given email (must have a pending registration)."""
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

    await send_otp_email(req.email, otp, pending.get("name", "User"))

    return {"status": "otp_sent", "message": "New verification code sent to your email"}


@router.post("/login")
async def login(req: LoginRequest):
    """
    Step 1 of login: Verify password and send OTP to user's email
    Returns {status: "otp_sent"}
    """
    db = get_db()
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password first
    if not user.get("password") or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Password correct - Generate and store OTP
    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    # Store OTP in login_otps collection
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
    
    # Send OTP email
    await send_otp_email(req.email, otp, user.get("name", "User"))
    
    return {"status": "otp_sent", "message": "Verification code sent to your email"}


@router.post("/login-verify")
async def login_verify(req: VerifyOTPRequest):
    """
    Step 2 of login: Verify OTP and return JWT token
    """
    db = get_db()
    
    # Check OTP
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
    
    # OTP is valid - get user
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Clean up OTP
    await db.login_otps.delete_one({"email": req.email.lower()})
    
    user_id = str(user["_id"])
    token = make_token(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "name": user["name"], "email": user["email"]},
    }


@router.post("/login-resend")
async def login_resend(req: ResendOTPRequest):
    """Resend login OTP"""
    db = get_db()
    
    # Verify user exists
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new OTP
    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    await db.login_otps.update_one(
        {"email": req.email.lower()},
        {"$set": {"otp": otp, "otp_expiry": otp_expiry}},
        upsert=True,
    )
    
    await send_otp_email(req.email, otp, user.get("name", "User"))
    
    return {"status": "otp_sent", "message": "New verification code sent to your email"}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {"user": {k: v for k, v in current_user.items() if k != "password"}}
