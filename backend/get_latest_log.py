"""
One-off script: prints the most recent EmailLog's id, contact_email,
opened, and clicked status, so you can test /track/open/{id} and
/track/click/{id} manually.

Run from your backend/ folder (same place you run other scripts like
crm_sync.py), so imports resolve correctly:

    python get_latest_log.py
"""

from database import connect_db  # adjust import if your connect fn lives elsewhere
from models import EmailLog

connect_db()

log = EmailLog.objects.order_by("-sent_at").first()

if not log:
    print("No EmailLog documents found.")
else:
    print(f"log_id:        {log.id}")
    print(f"contact_email: {log.contact_email}")
    print(f"status:        {log.status}")
    print(f"opened:        {log.opened}")
    print(f"clicked:       {log.clicked}")
    print(f"sent_at:       {log.sent_at}")
