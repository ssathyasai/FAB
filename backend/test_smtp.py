import os
from dotenv import load_dotenv
import smtplib

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

print(f"Testing SMTP login for: {SMTP_EMAIL}")
try:
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.starttls()
    server.login(SMTP_EMAIL, SMTP_PASSWORD)
    print("SUCCESS: SMTP login was successful! OTP will work.")
    server.quit()
except Exception as e:
    print(f"ERROR: SMTP login failed. Details: {e}")
