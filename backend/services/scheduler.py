"""
Scheduler backed by MongoDBJobStore instead of the default in-memory store —
same fix as before, different engine. Jobs persist in a dedicated
`apscheduler_jobs` collection so a Railway redeploy or crash-restart doesn't
silently drop or duplicate scheduled/recurring campaign sends.

Note: APScheduler's MongoDBJobStore is less widely used in production than
its SQLAlchemy equivalent [Speculative — smaller community, so fewer
edge-case reports surface online]. Watch job persistence closely after the
first few real deploys rather than assuming parity with the Postgres version.
"""
import os
from datetime import datetime, date
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.executors.pool import ThreadPoolExecutor

from models import Campaign, Automation, Contact, EmailLog
from services.email_sender import send_bulk_emails, render_body, notify

from zoneinfo import ZoneInfo
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from crm_sync import sync_contacts_from_crm

from models import Campaign, Automation, Contact, EmailLog, Template


MONGO_URI = os.getenv("MONGO_URI")
_client = MongoClient(MONGO_URI)

jobstores = {
    "default": MongoDBJobStore(
        database=_client.get_default_database().name,
        collection="apscheduler_jobs",
        client=_client,
    )
}
executors = {
    "default": ThreadPoolExecutor(max_workers=3)
}
job_defaults = {
    "coalesce": True,
    "max_instances": 1,
    "misfire_grace_time": 3600,
}

scheduler = BackgroundScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults,
    timezone="Asia/Karachi",
)


def start_scheduler():
    if not scheduler.running:
        scheduler.start()


def schedule_campaign(campaign_id: str, run_date, send_fn):
    scheduler.add_job(
        send_fn,
        trigger="date",
        run_date=run_date,
        args=[campaign_id],
        id=f"campaign_{campaign_id}",
        replace_existing=True,
    )


def schedule_recurring_monthly(automation_id: str, day_of_month: int, send_fn):
    scheduler.add_job(
        send_fn,
        trigger="cron",
        day=day_of_month,
        hour=9,
        minute=0,
        args=[automation_id],
        id=f"automation_{automation_id}",
        replace_existing=True,
    )


def run_nightly_crm_sync():
    """Runs crm_sync.py automatically instead of requiring someone to
    run it by hand. Logs a notification either way so failures are
    visible instead of silent."""
    try:
        sync_contacts_from_crm()
        notify(
            "automation_fired",
            "Nightly CRM sync completed",
            "Contacts were synced from the CRM automatically.",
        )
    except Exception as e:
        notify(
            "automation_failed",
            "Nightly CRM sync failed",
            f"Error: {str(e)}",
        )

def check_scheduled_campaigns():
    now = datetime.now(ZoneInfo("Asia/Karachi")).replace(tzinfo=None)

    due_campaigns = Campaign.objects(
        status="scheduled", schedule_type="scheduled", schedule_at__lte=now
    )

    for campaign in due_campaigns:
        _execute_campaign_send(campaign)

def check_automation_branches():
    """Runs hourly. For automations with branch_after_hours configured,
    checks each sent EmailLog once that window has passed and fires the
    'opened' or 'not opened' follow-up template accordingly — exactly
    once per log, guarded by branch_processed."""
    from datetime import datetime, timedelta

    branching_automations = Automation.objects(
        trigger_type="new_contact_webhook",
        trigger_config__branch_after_hours__exists=True,
    )

    for automation in branching_automations:
        wait_hours = automation.trigger_config.get("branch_after_hours")
        opened_template_id = automation.trigger_config.get("if_opened_template_id")
        not_opened_template_id = automation.trigger_config.get("if_not_opened_template_id")
        if not wait_hours or not (opened_template_id or not_opened_template_id):
            continue

        cutoff = datetime.utcnow() - timedelta(hours=wait_hours)
        due_logs = EmailLog.objects(
            automation_id=str(automation.id),
            status="sent",
            branch_processed=False,
            sent_at__lte=cutoff,
        )

        for log in due_logs:
            template_id = opened_template_id if log.opened else not_opened_template_id
            if not template_id:
                log.branch_processed = True
                log.save()
                continue

            template = Template.objects(id=template_id).first()
            contact = Contact.objects(email=log.contact_email).first()
            if template and contact:
                context = {
                    "name": contact.name, "email": contact.email,
                    "batch": contact.batch or "", "course": contact.course or "",
                }
                send_bulk_emails(
                    recipients=[{"email": contact.email, "contact_id": str(contact.id)}],
                    render_fn=lambda r, t=template, c=context: (
                        render_body(t.subject, c), render_body(t.body, c)
                    ),
                )
                notify(
                    "automation_fired",
                    f"Branch follow-up sent for '{automation.name}'",
                    f"{'Opened' if log.opened else 'Did not open'} branch → sent to {contact.email}",
                )

            log.branch_processed = True
            log.save()

def check_scheduled_automations():
    """Runs periodically. Finds active, schedule-type automations whose
    day_of_month condition matches today, and fires them — at most once
    per day per automation (guarded by last_fired_date)."""
    today = date.today()
    active_automations = Automation.objects(is_active=True, trigger_type="schedule")

    for automation in active_automations:
        target_day = automation.trigger_config.get("day_of_month")
        if target_day != today.day:
            continue

        last_fired = automation.trigger_config.get("last_fired_date")
        if last_fired == today.isoformat():
            continue

        _execute_automation_send(automation)

        automation.trigger_config["last_fired_date"] = today.isoformat()
        automation.save()


def _execute_campaign_send(campaign):
    rtype = campaign.recipients.get("type", "all")
    rvalue = campaign.recipients.get("value")
    qs = Contact.objects(status="active")
    if rtype == "batch" and rvalue:
        qs = qs.filter(batch=rvalue)
    elif rtype == "course" and rvalue:
        qs = qs.filter(course=rvalue)
    contacts = list(qs)

    if not contacts:
        campaign.status = "failed"
        campaign.save()
        notify("campaign_failed", f"Campaign '{campaign.name}' failed",
               "No matching active recipients were found.")
        return

    campaign.status = "sending"
    campaign.save()

    contacts_by_email = {c.email: c for c in contacts}
    recipients_payload = [{"email": c.email, "contact_id": str(c.id)} for c in contacts]

    def render_for_recipient(r):
        contact = contacts_by_email[r["email"]]
        context = {
            "name": contact.name, "email": contact.email,
            "batch": contact.batch or "", "course": contact.course or "",
        }
        return (
            render_body(campaign.template.subject, context),
            render_body(campaign.template.body, context),
        )

    result = send_bulk_emails(
        recipients=recipients_payload, render_fn=render_for_recipient,
        campaign_id=str(campaign.id),
    )

    campaign.status = "sent" if result["failed"] == 0 else "failed"
    campaign.save()

    notify(
        "campaign_sent" if result["failed"] == 0 else "campaign_failed",
        f"Campaign '{campaign.name}' {'sent' if result['failed'] == 0 else 'had failures'}",
        f"Sent: {result['sent']}, Failed: {result['failed']}, Skipped: {result['skipped']}",
    )


def _execute_automation_send(automation):
    contacts = list(Contact.objects(status="active"))
    if not contacts:
        notify("automation_failed", f"Automation '{automation.name}' skipped", "No active contacts to send to.")
        return

    recipients_payload = [{"email": c.email, "contact_id": str(c.id)} for c in contacts]
    contacts_by_email = {c.email: c for c in contacts}

    def render_for_recipient(r):
        contact = contacts_by_email[r["email"]]
        context = {
            "name": contact.name, "email": contact.email,
            "batch": contact.batch or "", "course": contact.course or "",
        }
        return (
            render_body(automation.template.subject, context),
            render_body(automation.template.body, context),
        )

    result = send_bulk_emails(recipients=recipients_payload, render_fn=render_for_recipient)

    # Tag the logs just created with this automation's id, so the branch
    # check later knows which automation to follow up for.
    from models import EmailLog
    EmailLog.objects(contact_email__in=[r["email"] for r in recipients_payload], automation_id=None).update(
    automation_id=str(automation.id)
)

    notify(
        "automation_fired" if result["failed"] == 0 else "automation_failed",
        f"Automation '{automation.name}' fired",
        f"Sent: {result['sent']}, Failed: {result['failed']}",
    )


# Register recurring background checks — placed at the very end, after
# everything they reference is defined.
scheduler.add_job(check_scheduled_campaigns, "interval", minutes=5, id="check_scheduled_campaigns", replace_existing=True)
scheduler.add_job(check_scheduled_automations, "interval", hours=1, id="check_scheduled_automations", replace_existing=True)
scheduler.add_job(run_nightly_crm_sync, "cron", hour=2, minute=0, id="nightly_crm_sync", replace_existing=True)
scheduler.add_job(check_automation_branches, "interval", hours=1, id="check_automation_branches", replace_existing=True)