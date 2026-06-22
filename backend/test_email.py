"""
Quick test script to verify SMTP email sending
Run with: python test_email.py
"""
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

print("=" * 60)
print("SMTP Configuration Test")
print("=" * 60)
print(f"SMTP Server: {SMTP_SERVER}")
print(f"SMTP Port: {SMTP_PORT}")
print(f"SMTP Email: {SMTP_EMAIL}")
print(f"SMTP Password: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else '(not set)'}")
print(f"Password Length: {len(SMTP_PASSWORD)}")
print(f"Password (raw): {repr(SMTP_PASSWORD)}")
print("=" * 60)

if not SMTP_EMAIL or not SMTP_PASSWORD:
    print("❌ ERROR: SMTP_EMAIL or SMTP_PASSWORD not configured in .env")
    exit(1)

test_otp = "123456"
test_email = input("\nEnter email to send test OTP to (or press Enter to skip): ").strip()

if not test_email:
    print("Skipping email test.")
    exit(0)

try:
    print(f"\n🔄 Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
    
    msg = MIMEMultipart()
    msg['From'] = SMTP_EMAIL
    msg['To'] = test_email
    msg['Subject'] = "AI FAB - Test Email"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>AI FAB Test Email</h2>
        <p>This is a test email from AI FAB.</p>
        <p>Your test OTP is: <strong style="font-size: 24px; color: #6366f1;">{test_otp}</strong></p>
        <p>If you received this, the email configuration is working correctly!</p>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(body, 'html'))
    
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
        print("🔄 Starting TLS...")
        server.starttls()
        
        print("🔄 Logging in...")
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        
        print("🔄 Sending email...")
        server.send_message(msg)
    
    print(f"\n✅ SUCCESS! Test email sent to {test_email}")
    print("📋 Check your inbox (and spam folder)")
    print(f"📋 Test OTP: {test_otp}")
    
except smtplib.SMTPAuthenticationError as e:
    print(f"\n❌ AUTHENTICATION ERROR: {e}")
    print("\n💡 Possible fixes:")
    print("   1. Enable 2-Step Verification in Google Account")
    print("   2. Generate App Password at: https://myaccount.google.com/apppasswords")
    print("   3. Use the 16-character App Password (no spaces)")
    print("   4. Make sure 'Less secure app access' is NOT needed with App Passwords")

except smtplib.SMTPException as e:
    print(f"\n❌ SMTP ERROR: {e}")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
