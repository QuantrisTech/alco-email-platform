"""
Scans the sending Gmail inbox for bounce-back messages ("Mail Delivery
Subsystem" / "Mailer-Daemon" emails), extracts the original recipient's
email address from each bounce, and marks the matching EmailLog record
as a hard bounce.

Run this the same way you run crm_sync.py (same venv, same folder):

    python check_bounces.py

Schedule it later (e.g. hourly, alongside your other APScheduler jobs)
once you've confirmed it works correctly run manually first.

Requires the same SMTP_EMAIL / SMTP_PASSWORD env vars already used for
sending (Gmail App Password), since Gmail's IMAP login uses the same
credentials as SMTP.
"""

import os
import re
import imaplib
import email
from email.header import decode_header

from database import connect_db  # adjust import if your connect fn lives elsewhere
from models import EmailLog

IMAP_HOST = "imap.gmail.com"
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# Matches an email address anywhere in the bounce body
EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

# Common bounce sender patterns across providers
BOUNCE_SENDERS = ("mailer-daemon", "mail delivery subsystem", "postmaster")


def _get_text(msg) -> str:
    """Extracts plain text body from an email.message.Message, walking
    multipart messages if needed."""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                try:
                    return part.get_payload(decode=True).decode(errors="ignore")
                except Exception:
                    continue
        return ""
    else:
        try:
            return msg.get_payload(decode=True).decode(errors="ignore")
        except Exception:
            return ""


def check_bounces():
    connect_db()

    imap = imaplib.IMAP4_SSL(IMAP_HOST)
    imap.login(SMTP_EMAIL, SMTP_PASSWORD)
    imap.select("INBOX")

    # Only look at unseen messages so we don't reprocess the same bounce
    # every run
    status, data = imap.search(None, "UNSEEN")
    if status != "OK":
        print("IMAP search failed.")
        imap.logout()
        return

    message_ids = data[0].split()
    marked, scanned = 0, 0

    for msg_id in message_ids:
        status, msg_data = imap.fetch(msg_id, "(RFC822)")
        if status != "OK":
            continue

        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)

        from_header = msg.get("From", "").lower()
        if not any(sender in from_header for sender in BOUNCE_SENDERS):
            continue

        scanned += 1
        body = _get_text(msg)
        found_emails = EMAIL_RE.findall(body)

        # Exclude the sending address itself from matches
        candidate_emails = [e for e in found_emails if e.lower() != (SMTP_EMAIL or "").lower()]

        for candidate in candidate_emails:
            log = EmailLog.objects(contact_email=candidate, status="sent").order_by("-sent_at").first()
            if log and not log.is_hard_bounce:
                log.is_hard_bounce = True
                log.save()
                marked += 1
                print(f"Marked hard bounce: {candidate} (log_id={log.id})")
                break  # first real match is usually the actual recipient

    imap.logout()
    print(f"Bounce check complete: {scanned} bounce emails scanned, {marked} EmailLog records marked.")


if __name__ == "__main__":
    check_bounces()