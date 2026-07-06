"""
Handles outbound send via Gmail SMTP. Logging writes directly via
mongoengine documents — each EmailLog().save() is its own write, no
session/commit pattern. A crash mid-send-loop leaves every prior send's
log already persisted individually, which is actually safer here than a
single uncommitted SQL transaction would have been.

Same two load-bearing safeguards as before:

1. Daily send counter — in-process only (see NOTE below), guards against
   Gmail's ~500/day bulk-send threshold that causes silent account
   suspension if exceeded.

2. Signed unsubscribe tokens — HMAC over (email, campaign_id), verified
   before flipping a contact's status, so the link can't be spoofed or
   silently triggered by corporate email link-scanners pre-fetching it.
"""
import os
import time
import smtplib
import hashlib
import hmac
import base64
from email.mime.text import MIMEText
from datetime import date
from dotenv import load_dotenv

from models import EmailLog

load_dotenv()  # same import-order defense as scheduler.py — see that file's comment

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_DAILY_LIMIT = int(os.getenv("SMTP_DAILY_LIMIT", 450))
UNSUB_SECRET = os.getenv("UNSUB_SECRET", "")
PLATFORM_URL = os.getenv("PLATFORM_URL", "https://platform.alco.com")
SEND_DELAY_SECONDS = 1.5

# In-process counter reset daily. NOTE: if you ever run multiple worker
# processes (e.g. Railway autoscaling), this needs to move to a Mongo-backed
# counter document instead — a `send_counters` collection keyed by date,
# incremented with an atomic $inc — otherwise each process gets its own
# counter and the Gmail daily cap gets silently bypassed. Flagging now,
# not fixing pre-emptively, since single-process is the current deployment
# assumption and this would be premature complexity otherwise.
_send_count = {"date": date.today(), "count": 0}


def _check_daily_limit() -> bool:
    today = date.today()
    if _send_count["date"] != today:
        _send_count["date"] = today
        _send_count["count"] = 0
    return _send_count["count"] < SMTP_DAILY_LIMIT


def _increment_send_count():
    _send_count["count"] += 1


def sign_unsubscribe_token(email: str, campaign_id: str = "0") -> str:
    payload = f"{email}:{campaign_id}".encode()
    sig = hmac.new(UNSUB_SECRET.encode(), payload, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode().rstrip("=")


def verify_unsubscribe_token(email: str, campaign_id: str, token: str) -> bool:
    expected = sign_unsubscribe_token(email, campaign_id)
    return hmac.compare_digest(expected, token)


def build_unsubscribe_link(email: str, campaign_id: str = "0") -> str:
    token = sign_unsubscribe_token(email, campaign_id)
    return f"{PLATFORM_URL}/unsubscribe?email={email}&campaign_id={campaign_id}&token={token}"


def render_body(template_body: str, context: dict) -> str:
    body = template_body
    for key, value in context.items():
        body = body.replace(f"{{{{{key}}}}}", str(value))
    return body


def send_email(to_email: str, subject: str, body: str,
                campaign_id: str = None, contact_id: str = None) -> bool:
    """Sends one email. Logs the outcome as a mongoengine document.
    Returns True on success."""
    if not _check_daily_limit():
        EmailLog(
            campaign_id=campaign_id, contact_id=contact_id, contact_email=to_email,
            status="failed", error="Daily SMTP send limit reached — queue for tomorrow",
        ).save()
        return False

    footer = f"\n\n---\nUnsubscribe: {build_unsubscribe_link(to_email, campaign_id or '0')}"
    msg = MIMEText(body + footer)
    msg["Subject"] = subject
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
        _increment_send_count()
        EmailLog(
            campaign_id=campaign_id, contact_id=contact_id, contact_email=to_email,
            status="sent",
        ).save()
        time.sleep(SEND_DELAY_SECONDS)
        return True
    except Exception as e:
        EmailLog(
            campaign_id=campaign_id, contact_id=contact_id, contact_email=to_email,
            status="failed", error=str(e),
        ).save()
        return False
