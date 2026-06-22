with open(r"c:\FAB\backend\routers\auth.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False

for i, line in enumerate(lines):
    # Remove RESEND_API_KEY
    if line.startswith("RESEND_API_KEY ="):
        continue
        
    # Remove Mailgun, Brevo, Resend from send_otp_email
    if line.strip() == "# 1. Try Mailgun API first (100 emails/day FREE forever!)":
        skip = True
    
    if line.strip() == "# 4. Fall back to Gmail SMTP":
        skip = False
        new_lines.append(line.replace("# 4. Fall back to Gmail SMTP", "# Send via Gmail SMTP"))
        continue
        
    if skip:
        continue
        
    # Remove _send_brevo_smtp function
    if line.startswith("def _send_brevo_smtp"):
        skip = True
        continue
        
    if skip and line.startswith("def _send_smtp"):
        skip = False
        
    # Update health check
    if line.strip() == "resend_key = os.getenv(\"RESEND_API_KEY\", \"\")":
        continue
    if line.strip() == "\"resend_configured\": bool(resend_key),":
        continue
    if "\"resend_from_email\"" in line:
        continue
        
    if not skip:
        new_lines.append(line)

with open(r"c:\FAB\backend\routers\auth.py", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
