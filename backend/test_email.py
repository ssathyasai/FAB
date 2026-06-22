"""
Quick test script to verify email sending (SMTP and Resend API)
Run with: python test_email.py
"""
import os
import sys
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx

load_dotenv()

def test_smtp_flow(test_email: str):
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

    print("\n" + "=" * 60)
    print("Running SMTP Configuration Test")
    print("=" * 60)
    print(f"SMTP Server: {SMTP_SERVER}")
    print(f"SMTP Port: {SMTP_PORT}")
    print(f"SMTP Email: {SMTP_EMAIL}")
    print(f"SMTP Password: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else '(not set)'}")
    print(f"Password Length: {len(SMTP_PASSWORD)}")
    print("=" * 60)

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[ERROR] SMTP_EMAIL or SMTP_PASSWORD not configured in .env")
        return False

    test_otp = "123456"

    try:
        print(f"\n[STATUS] Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
        
        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = test_email
        msg['Subject'] = "AI FAB - SMTP Test Email"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>AI FAB SMTP Test Email</h2>
            <p>This is a test email from AI FAB using standard SMTP.</p>
            <p>Your test OTP is: <strong style="font-size: 24px; color: #6366f1;">{test_otp}</strong></p>
            <p>If you received this, your local SMTP configuration works correctly!</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            print("[STATUS] Starting TLS...")
            server.starttls()
            
            print("[STATUS] Logging in...")
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            
            print("[STATUS] Sending email...")
            server.send_message(msg)
        
        print(f"\n[SUCCESS] Test email sent via SMTP to {test_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n[ERROR] AUTHENTICATION ERROR: {e}")
        print("\n[TIP] Possible fixes:")
        print("   1. Enable 2-Step Verification in Google Account")
        print("   2. Generate App Password at: https://myaccount.google.com/apppasswords")
        print("   3. Use the 16-character App Password (no spaces)")
        return False
    except Exception as e:
        print(f"\n[ERROR] SMTP ERROR: {e}")
        return False


def test_resend_flow(test_email: str):
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "AI FAB <onboarding@resend.dev>")

    print("\n" + "=" * 60)
    print("Running Resend API Test")
    print("=" * 60)
    print(f"Resend API Key: {'*' * 10 + RESEND_API_KEY[-5:] if RESEND_API_KEY else '(not set)'}")
    print(f"Resend From: {RESEND_FROM_EMAIL}")
    print("=" * 60)

    if not RESEND_API_KEY:
        print("[ERROR] RESEND_API_KEY not configured in .env")
        return False

    test_otp = "654321"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>AI FAB Resend API Test Email</h2>
        <p>This is a test email from AI FAB using the Resend HTTP API.</p>
        <p>Your test OTP is: <strong style="font-size: 24px; color: #8b5cf6;">{test_otp}</strong></p>
        <p>If you received this, your Resend API configuration is fully functional!</p>
    </body>
    </html>
    """

    try:
        print(f"\n[STATUS] Sending request to Resend API...")
        res = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": RESEND_FROM_EMAIL,
                "to": [test_email],
                "subject": "AI FAB - Resend API Test",
                "html": body,
            },
            timeout=10.0
        )
        if res.status_code in (200, 201):
            print(f"\n[SUCCESS] Resend email sent successfully to {test_email}")
            print(f"Response: {res.text}")
            return True
        else:
            print(f"\n[ERROR] RESEND API ERROR ({res.status_code}): {res.text}")
            if "onboarding@resend.dev" in RESEND_FROM_EMAIL and "restrict" in res.text.lower():
                print("\n[TIP] NOTE: With free/unverified Resend domains, you can only send emails to your own registered Resend account email.")
            return False
    except Exception as e:
        print(f"\n[ERROR] Resend request failed: {e}")
        return False


def main():
    print("============================================================")
    print("                  AI FAB Email System Test                  ")
    print("============================================================")
    
    test_email = input("Enter recipient email address: ").strip()
    if not test_email:
        print("[ERROR] Recipient email is required.")
        sys.exit(1)
        
    print("\nSelect test method:")
    print("1) Test standard SMTP configuration")
    print("2) Test Resend HTTP API configuration")
    print("3) Test both")
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice == '1':
        test_smtp_flow(test_email)
    elif choice == '2':
        test_resend_flow(test_email)
    elif choice == '3':
        smtp_ok = test_smtp_flow(test_email)
        resend_ok = test_resend_flow(test_email)
        print("\n" + "=" * 60)
        print("Summary of Results:")
        print(f"SMTP Test:   {'[SUCCESS] PASSED' if smtp_ok else '[ERROR] FAILED'}")
        print(f"Resend Test: {'[SUCCESS] PASSED' if resend_ok else '[ERROR] FAILED'}")
        print("=" * 60)
    else:
        print("Invalid choice. Exiting.")

if __name__ == "__main__":
    main()
