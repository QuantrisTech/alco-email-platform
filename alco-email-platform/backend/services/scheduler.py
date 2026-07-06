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
from dotenv import load_dotenv
from pymongo import MongoClient

# Loaded here too, not just in main.py — this module must not depend on
# import order. Any script or worker that imports scheduler.py directly
# (a management command, a test, a future Celery task) needs MONGO_URI
# populated regardless of whether main.py ran first. Caught this the hard
# way: importing this module in isolation raised ConfigurationError because
# get_default_database() found MONGO_URI=None.
load_dotenv()
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.executors.pool import ThreadPoolExecutor

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
    "coalesce": True,            # if multiple runs were missed, run once, not N times
    "max_instances": 1,          # never run the same job concurrently
    "misfire_grace_time": 3600,  # tolerate up to 1hr delay after a restart before treating as missed
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
    """One-off scheduled send. Job id is deterministic so re-registering
    on app restart doesn't create duplicates."""
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
