import logging
import os
import smtplib
from email.message import EmailMessage


logger = logging.getLogger(__name__)


def send_password_reset_email(*, recipient: str, reset_url: str) -> None:
    sender = os.getenv("EMAIL_FROM", "no-reply@interviewprep.local")
    subject = "Reset your InterviewPrep password"
    body = (
        "You requested a password reset for InterviewPrep.\n\n"
        f"Open this link to set a new password:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email.\n"
    )

    smtp_host = os.getenv("SMTP_HOST")
    if not smtp_host:
        logger.info("Password reset link for %s: %s", recipient, reset_url)
        return

    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
        if use_tls:
            smtp.starttls()
        if smtp_username and smtp_password:
            smtp.login(smtp_username, smtp_password)
        smtp.send_message(message)
