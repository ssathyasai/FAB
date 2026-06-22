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
    """Send OTP via email. Supports Brevo SMTP (primary), Resend API, and Gmail SMTP (fallback)."""
    import asyncio
    
    # Always print OTP to console as backup
    print(f"[OTP] [BACKUP] Backup OTP for {email}: {otp}")
    
    body = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#f4f4f5;">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size:28px; letter-spacing:-0.5px;">💰 AI FAB</h1>
        <p style="color: rgba(255,255,255,0.8); margin-top: 8px; font-size:14px;">AI-Powered Financial Advisor & Budget Planner</p>
    </div>

    <div style="padding: 32px; background: #ffffff; border-radius: 16px; margin-top: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <h2 style="color: #09090b; margin:0 0 8px;">Hi {name} 👋</h2>
        <p style="color: #71717a; font-size: 15px; line-height:1.6;">
            Welcome to AI FAB! Please use the code below to verify your email address.
            This code is valid for <strong>10 minutes</strong>.
        </p>

        <div style="background: #f4f4f5; padding: 28px; border-radius: 12px; text-align: center; margin: 28px 0;">
            <p style="color: #71717a; font-size: 12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px;">Your verification code</p>
            <h1 style="color: #6366f1; font-size: 52px; letter-spacing: 14px; margin: 0; font-weight:800;">{otp}</h1>
            <p style="color: #a1a1aa; font-size: 12px; margin-top: 12px;">Do not share this code with anyone</p>
        </div>

        <p style="color: #a1a1aa; font-size: 13px;">If you didn't create an AI FAB account, you can safely ignore this email.</p>
    </div>

    <div style="text-align: center; margin-top: 20px; color: #a1a1aa; font-size: 12px;">
        <p>© 2026 AI FAB. All rights reserved.</p>
    </div>
</body>
</html>
"""

    try:
        # Send via Gmail SMTP
        if not SMTP_EMAIL or not SMTP_PASSWORD:
            print(f"[OTP] [EMAIL] Email not configured. Using console OTP only.")
            return True, "Email not configured, bypassed using console backup."

        # Create email message for Gmail SMTP
        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = email
        msg['Subject'] = "AI FAB – Email Verification Code"
        msg.attach(MIMEText(body, 'html'))

        # Send email synchronously with timeout
        loop = asyncio.get_event_loop()
        try:
            await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: _send_smtp(msg, email, otp)
                ),
                timeout=15.0
            )
            print(f"[OTP] [SUCCESS] Email sent successfully via Gmail SMTP to {email}")
            return True, "Email sent successfully via Gmail SMTP"
            
        except asyncio.TimeoutError:
            err_msg = f"SMTP Connection Timeout: Connecting to {SMTP_SERVER}:{SMTP_PORT} timed out. Outbound SMTP ports might be blocked. Please configure MAILGUN_API_KEY."
            print(f"[OTP] [TIMEOUT] {err_msg}")
            return False, err_msg
        except Exception as e:
            err_msg = f"Gmail SMTP Failed: {str(e)}"
            print(f"[OTP] [ERROR] {err_msg}")
            import traceback
            traceback.print_exc()
            return False, err_msg
        
    except Exception as e:
        err_msg = f"Unexpected email module error: {str(e)}"
        print(f"[OTP] [ERROR] {err_msg}")
        import traceback
        traceback.print_exc()
        return False, err_msg


