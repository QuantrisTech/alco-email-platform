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

CONNECTION HANDLING: send_bulk_emails() opens ONE SMTP connection and
reuses it across the whole batch — this is the correct pattern for
campaign sends. send_email() still exists for one-off sends (e.g. a
manual test email) and opens its own single connection internally,
it should NOT be called in a loop — use send_bulk_emails() for that.
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

from models import Notification

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


def notify(ntype: str, title: str, message: str):
    """Creates a notification record. Called after any real background
    action (scheduled send, automation fire) so the user has visibility
    without needing to check server logs."""
    Notification(type=ntype, title=title, message=message).save()

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
    """Replaces {key} placeholders (single braces, matching how templates
    are authored in the Templates page) with real values. Any placeholder
    with no matching context value is left as-is rather than silently
    blanked out, so a missing field is visible/debuggable, not hidden."""
    body = template_body
    for key, value in context.items():
        body = body.replace(f"{{{key}}}", str(value))
    return body


def _open_smtp_connection():
    """
    Opens and authenticates a single SMTP connection. Raises
    smtplib.SMTPAuthenticationError with a clearer message if the
    credentials are wrong - most commonly because someone used their
    normal Gmail login password instead of an App Password.
    """
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    server.starttls()
    try:
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
    except smtplib.SMTPAuthenticationError as e:
        server.quit()
        raise smtplib.SMTPAuthenticationError(
            e.smtp_code,
            (
                "Gmail rejected these credentials. If you're using a normal "
                "Gmail account password, that won't work - Gmail requires an "
                "App Password for SMTP. Generate one at "
                "https://myaccount.google.com/apppasswords and set it as "
                "SMTP_PASSWORD in .env."
            ).encode("ascii"),
        )
    return server


def _send_via_connection(server, to_email: str, subject: str, body: str,
                          campaign_id: str = None, contact_id: str = None) -> bool:
    """Sends one email using an already-open, already-authenticated
    SMTP connection. Does not open or close the connection itself —
    the caller (send_bulk_emails or send_email) owns that lifecycle."""
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
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
        _increment_send_count()
        EmailLog(
            campaign_id=campaign_id, contact_id=contact_id, contact_email=to_email,
            status="sent",
        ).save()
        return True
    except Exception as e:
        EmailLog(
            campaign_id=campaign_id, contact_id=contact_id, contact_email=to_email,
            status="failed", error=str(e),
        ).save()
        return False


def send_email(to_email: str, subject: str, body: str,
                campaign_id: str = None, contact_id: str = None) -> bool:
    """
    Sends a SINGLE one-off email (e.g. a manual test send). Opens and
    closes its own connection. Do NOT call this in a loop for a batch —
    use send_bulk_emails() instead, which reuses one connection for the
    whole run.
    """
    try:
        server = _open_smtp_connection()
    except smtplib.SMTPAuthenticationError as e:
        EmailLog(
            campaign_id=campaign_id, contact_id=contact_id, contact_email=to_email,
            status="failed", error=str(e),
        ).save()
        return False

    try:
        result = _send_via_connection(server, to_email, subject, body, campaign_id, contact_id)
    finally:
        server.quit()
    return result


def send_bulk_emails(recipients: list, render_fn, campaign_id: str = None) -> dict:
    """
    Sends to a list of recipients using ONE shared SMTP connection for
    the whole batch — this is the correct pattern for campaign sends,
    including personalized content per recipient.

    recipients: list of dicts, each with at least "email" and optionally
    "contact_id".

    render_fn: a function taking a single recipient dict and returning
    (subject, body) already personalized for that recipient. Called once
    per recipient — this is what allows per-contact {name}/{course}
    substitution while still reusing one open connection for everyone.

    Returns a summary dict: {"sent": int, "failed": int, "skipped": int}
    """
    summary = {"sent": 0, "failed": 0, "skipped": 0}

    try:
        server = _open_smtp_connection()
    except smtplib.SMTPAuthenticationError as e:
        for r in recipients:
            EmailLog(
                campaign_id=campaign_id, contact_id=r.get("contact_id"),
                contact_email=r["email"], status="failed", error=str(e),
            ).save()
        summary["failed"] = len(recipients)
        return summary

    try:
        for r in recipients:
            if not _check_daily_limit():
                EmailLog(
                    campaign_id=campaign_id, contact_id=r.get("contact_id"),
                    contact_email=r["email"], status="failed",
                    error="Daily SMTP send limit reached — queue for tomorrow",
                ).save()
                summary["skipped"] += 1
                continue

            subject, body = render_fn(r)

            ok = _send_via_connection(
                server, r["email"], subject, body,
                campaign_id=campaign_id, contact_id=r.get("contact_id"),
            )
            if ok:
                summary["sent"] += 1
            else:
                summary["failed"] += 1

            time.sleep(SEND_DELAY_SECONDS)
    finally:
        server.quit()

    return summary
"""
    try:
        for r in recipients:
            if not _check_daily_limit():
                EmailLog(
                    campaign_id=campaign_id, contact_id=r.get("contact_id"),
                    contact_email=r["email"], status="failed",
                    error="Daily SMTP send limit reached — queue for tomorrow",
                ).save()
                summary["skipped"] += 1
                continue

            ok = _send_via_connection(
                server, r["email"], subject, body,
                campaign_id=campaign_id, contact_id=r.get("contact_id"),
            )
            if ok:
                summary["sent"] += 1
            else:
                summary["failed"] += 1

            time.sleep(SEND_DELAY_SECONDS)
    finally:
        server.quit()

    return summary
    """