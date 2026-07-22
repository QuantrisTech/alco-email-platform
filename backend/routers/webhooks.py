import os
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from models import Automation, Contact, EmailLog
from services.email_sender import send_bulk_emails, render_body, notify

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

CRM_WEBHOOK_SECRET = os.getenv("CRM_WEBHOOK_SECRET", "")


class CrmEventPayload(BaseModel):
    event: str
    contact_email: str
    contact_name: str = ""


class CrmContactPayload(BaseModel):
    email: str
    name: str
    batch: str = None
    course: str = None
    is_active: bool = True


@router.post("/crm-event", status_code=200)
def receive_crm_event(payload: CrmEventPayload, x_webhook_secret: str = Header(None)):
    if not CRM_WEBHOOK_SECRET or x_webhook_secret != CRM_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    matching_automations = Automation.objects(
        trigger_type="new_contact_webhook",
        is_active=True,
    )

    fired_count = 0
    for automation in matching_automations:
        target_event = automation.trigger_config.get("event")
        if target_event != payload.event:
            continue

        contact = Contact.objects(email=payload.contact_email).first()
        if contact is None:
            contact = Contact(
                name=payload.contact_name or payload.contact_email,
                email=payload.contact_email,
                status="active",
            ).save()

        if contact.status != "active":
            continue

        context = {
            "name": contact.name, "email": contact.email,
            "batch": contact.batch or "", "course": contact.course or "",
        }

        def render_fn(r, ctx=context):
            return (
                render_body(automation.template.subject, ctx),
                render_body(automation.template.body, ctx),
            )

        result = send_bulk_emails(
        recipients=[{"email": contact.email, "contact_id": str(contact.id)}],
        render_fn=render_fn,
)

        from models import EmailLog
        EmailLog.objects(contact_email=contact.email, automation_id=None).update(automation_id=str(automation.id))

        notify(
            "automation_fired" if result["failed"] == 0 else "automation_failed",
            f"Automation '{automation.name}' fired ({payload.event})",
            f"Sent to {contact.email}: {result['sent']} sent, {result['failed']} failed",
        )
        fired_count += 1

    return {"received": True, "event": payload.event, "automations_fired": fired_count}


@router.post("/crm-contact", status_code=200)
def receive_crm_contact(payload: CrmContactPayload, x_webhook_secret: str = Header(None)):
    """
    Called by the CRM the moment a new user is created, or an existing
    one's batch/course changes — keeps Contacts current in real time
    instead of waiting for the nightly sync.
    """
    if not CRM_WEBHOOK_SECRET or x_webhook_secret != CRM_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    status = "active" if payload.is_active else "unsubscribed"

    contact = Contact.objects(email=payload.email).first()
    if contact:
        contact.name = payload.name
        contact.batch = payload.batch
        contact.course = payload.course
        contact.status = status
        contact.save()
        action = "updated"
    else:
        Contact(
            name=payload.name,
            email=payload.email,
            batch=payload.batch,
            course=payload.course,
            status=status,
        ).save()
        action = "created"

    return {"received": True, "action": action, "email": payload.email}