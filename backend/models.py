"""
MongoDB documents via mongoengine (chosen over raw pymongo for structural
parity with the previous SQLAlchemy models — declarative fields, choices,
indexes — while accepting Mongo's actual constraints below).

No foreign key enforcement exists in Mongo. Two patterns are used instead:

1. Campaign.template and Automation.template EMBED a TemplateSnapshot taken
   at creation time, rather than referencing Template by ID. This is a
   deliberate denormalization: editing a Template later does NOT retroactively
   change campaigns/automations that already reference it. If you actually
   want live-linked templates (edit propagates to all campaigns using it),
   that's a different design — say so before this ships, it changes the
   Campaign composer's save logic.

2. EmailLog.campaign_id / contact_id are plain string IDs, not enforced
   references. A campaign or contact can be deleted while logs pointing to
   it still exist — the analytics/history views must handle a missing
   lookup gracefully (show "deleted campaign", not crash).
"""
from datetime import datetime
import mongoengine as me


# ---------- Contacts ----------

class Contact(me.Document):
    name = me.StringField(required=True)
    email = me.EmailField(required=True, unique=True)
    batch = me.StringField()
    course = me.StringField()
    status = me.StringField(choices=("active", "unsubscribed"), default="active")
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "contacts",
        "indexes": ["email", "batch", "course", "status"],
    }


# ---------- Templates ----------

class Template(me.Document):
    name = me.StringField(required=True)
    subject = me.StringField(required=True)
    body = me.StringField(required=True)
    variables = me.ListField(me.StringField(), default=list)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {"collection": "templates"}


class TemplateSnapshot(me.EmbeddedDocument):
    """Frozen copy of a template's content at the moment a campaign/automation
    was created. See module docstring — this replaces the Postgres FK."""
    template_id = me.StringField()
    name = me.StringField()
    subject = me.StringField()
    body = me.StringField()


# ---------- Campaigns ----------

class Campaign(me.Document):
    name = me.StringField(required=True)
    template = me.EmbeddedDocumentField(TemplateSnapshot, required=True)
    recipients = me.DictField()  # {"type": "all|batch|course|custom", "value": ...}
    schedule_type = me.StringField(
        choices=("now", "scheduled", "recurring_monthly"), default="now"
    )
    schedule_at = me.DateTimeField()
    status = me.StringField(
        choices=("draft", "scheduled", "sending", "sent", "failed"), default="draft"
    )
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {"collection": "campaigns", "indexes": ["status", "schedule_type"]}


# ---------- Email Logs ----------

class EmailLog(me.Document):
    campaign_id = me.StringField()
    contact_id = me.StringField()
    contact_email = me.StringField(required=True)
    opened = me.BooleanField(default=False)
    clicked = me.BooleanField(default=False)
    is_hard_bounce = me.BooleanField(default=False)
    automation_id = me.StringField()
    branch_processed = me.BooleanField(default=False)
    status = me.StringField(
        choices=("sent", "failed", "skipped_unsubscribed"), required=True
    )
    error = me.StringField()
    sent_at = me.DateTimeField(default=datetime.utcnow)

    meta = {"collection": "email_logs", "indexes": ["campaign_id", "contact_id", "sent_at"]}


# ---------- Automations ----------

class Automation(me.Document):
    name = me.StringField(required=True)
    trigger_type = me.StringField(
        choices=("new_contact_webhook", "schedule", "manual"), required=True
    )
    trigger_config = me.DictField()  # e.g. {"day_of_month": 1} or {"inactive_days": 7}
    template = me.EmbeddedDocumentField(TemplateSnapshot, required=True)
    is_active = me.BooleanField(default=False)
    created_at = me.DateTimeField(default=datetime.utcnow)
    {
  "event": "enrolled",
  "branch_after_hours": 24,
  "if_opened_template_id": "...",
  "if_not_opened_template_id": "..."
}

    meta = {"collection": "automations"}

class User(me.Document):
    email = me.EmailField(required=True, unique=True)
    password_hash = me.StringField(required=True)
    name = me.StringField()
    role = me.StringField(choices=("admin", "editor"), default="editor")
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "users",
        "indexes": ["email"],
    }

# ---------- Notifications ----------
class Notification(me.Document):
    type = me.StringField(
        choices=("campaign_sent", "campaign_failed", "automation_fired", "automation_failed"),
        required=True,
    )
    title = me.StringField(required=True)
    message = me.StringField(required=True)
    read = me.BooleanField(default=False)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {"collection": "notifications", "indexes": ["-created_at", "read"]}

# ---------- Segments ----------
class Segment(me.Document):
    name = me.StringField(required=True)
    rules = me.DictField()  # e.g. {"status": "active", "course": "NLP Practitioner Course"}
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {"collection": "segments"}