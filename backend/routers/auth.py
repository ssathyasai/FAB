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
import httpx

router = APIRouter()
bearer = HTTPBearer(auto_error=False)

SECRET = os.getenv("JWT_SECRET", "fab_finance_secret_key_2024")
ALGO = "HS256"
EXPIRE_DAYS = 30

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback")


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


class GoogleAuthRequest(BaseModel):
    code: str


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
    hashed = pwd.hash(req.password)

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


@router.post("/google")
async def google_auth(req: GoogleAuthRequest):
    """
    Exchange a Google OAuth2 authorization code for a FAB Finance JWT.
    Creates a new user if first time, or logs in the existing Google user.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[Google OAuth] Starting authentication process")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured on this server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env"
        )

    async with httpx.AsyncClient() as client:
        # Step 1: Exchange auth code for tokens
        logger.info(f"[Google OAuth] Exchanging authorization code...")
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": req.code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            logger.error(f"[Google OAuth] Token exchange failed: {token_response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange Google authorization code")

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received from Google")

        logger.info(f"[Google OAuth] Access token received, fetching user info...")
        
        # Step 2: Fetch user info from Google
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_response.status_code != 200:
            logger.error(f"[Google OAuth] Failed to fetch user info: {userinfo_response.text}")
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")

        google_user = userinfo_response.json()

    google_id = google_user.get("id")
    email = google_user.get("email", "").lower()
    name = google_user.get("name", email.split("@")[0])
    picture = google_user.get("picture", "")

    logger.info(f"[Google OAuth] User info received: {email}, ID: {google_id}")

    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Could not get user info from Google")

    db = get_db()

    # Step 3: Upsert user — find by google_id first, then by email
    logger.info(f"[Google OAuth] Looking for existing user with google_id: {google_id}")
    user = await db.users.find_one({"google_id": google_id})
    
    if not user:
        logger.info(f"[Google OAuth] No user with google_id, checking email: {email}")
        user = await db.users.find_one({"email": email})

    if user:
        # Existing user — update Google info
        logger.info(f"[Google OAuth] Found existing user, updating Google info")
        from bson import ObjectId
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "google_id": google_id,
                "picture": picture,
                "name": name,
                "email_verified": True,
            }},
        )
        user_id = str(user["_id"])
        user_name = name
        logger.info(f"[Google OAuth] User updated: {user_id}")
    else:
        # New user via Google — create account (no password, email pre-verified)
        logger.info(f"[Google OAuth] Creating new user for {email}")
        doc = {
            "name": name,
            "email": email,
            "google_id": google_id,
            "picture": picture,
            "password": None,
            "email_verified": True,
            "created_at": datetime.utcnow(),
        }
        result = await db.users.insert_one(doc)
        user_id = str(result.inserted_id)
        user_name = name
        logger.info(f"[Google OAuth] New user created: {user_id}")

    token = make_token(user_id)
    logger.info(f"[Google OAuth] JWT token generated for user: {user_id}")
    
    return {
        "token": token,
        "user": {"id": user_id, "name": user_name, "email": email, "picture": picture},
    }


@router.post("/login")
async def login(req: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Google-only accounts have no password
    if not user.get("password"):
        raise HTTPException(
            status_code=401,
            detail="This account uses Google Sign-In. Please click 'Continue with Google'."
        )

    if not pwd.verify(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = make_token(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "name": user["name"], "email": user["email"]},
    }


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {"user": {k: v for k, v in current_user.items() if k != "password"}}
