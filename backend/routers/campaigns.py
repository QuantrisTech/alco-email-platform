from unittest import result

from models import Contact
from services.email_sender import send_bulk_emails, render_body

from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, Query
from mongoengine.errors import ValidationError as MEValidationError
from pydantic import BaseModel

from models import Campaign, Template, TemplateSnapshot, EmailLog
from routers.auth import get_current_user

from models import EmailLog

from services.email_sender import notify

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class RecipientsFilter(BaseModel):
    type: str  # "all" | "batch" | "course" | "custom"
    value: Optional[Any] = None  # batch name, course name, or list of contact ids


class CampaignCreate(BaseModel):
    name: str
    template_id: str
    recipients: RecipientsFilter
    schedule_type: Optional[str] = "now"
    schedule_at: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    # Only meaningful while status == "draft" — enforced in the route below.
    name: Optional[str] = None
    template_id: Optional[str] = None
    recipients: Optional[RecipientsFilter] = None
    schedule_type: Optional[str] = None
    schedule_at: Optional[datetime] = None


class TemplateSnapshotOut(BaseModel):
    template_id: Optional[str] = None
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None


class CampaignOut(BaseModel):
    id: str
    name: str
    template: TemplateSnapshotOut
    recipients: dict
    recipients_count: int
    schedule_type: str
    schedule_at: Optional[datetime] = None
    status: str
    created_at: datetime

    @staticmethod
    def from_doc(doc: Campaign) -> "CampaignOut":
        return CampaignOut(
            id=str(doc.id),
            name=doc.name,
            template=TemplateSnapshotOut(
                template_id=doc.template.template_id,
                name=doc.template.name,
                subject=doc.template.subject,
                body=doc.template.body,
            ),
            recipients=doc.recipients,
            recipients_count=_count_recipients(doc.recipients),
            schedule_type=doc.schedule_type,
            schedule_at=doc.schedule_at,
            status=doc.status,
            created_at=doc.created_at,
        )


def _count_recipients(recipients_filter: dict) -> int:
    rtype = recipients_filter.get("type", "all")
    rvalue = recipients_filter.get("value")
    qs = Contact.objects(status="active")
    if rtype == "batch" and rvalue:
        qs = qs.filter(batch=rvalue)
    elif rtype == "course" and rvalue:
        qs = qs.filter(course=rvalue)
    return qs.count()

class CampaignListOut(BaseModel):
    total: int
    items: List[CampaignOut]


def _build_snapshot(template_id: str) -> TemplateSnapshot:
    tmpl = Template.objects(id=template_id).first()
    if tmpl is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateSnapshot(
        template_id=str(tmpl.id),
        name=tmpl.name,
        subject=tmpl.subject,
        body=tmpl.body,
    )


@router.get("", response_model=CampaignListOut)
def list_campaigns(
    status: Optional[str] = Query(None),
    schedule_type: Optional[str] = Query(None),
    _user: str = Depends(get_current_user),
):
    qs = Campaign.objects
    if status:
        qs = qs.filter(status=status)
    if schedule_type:
        qs = qs.filter(schedule_type=schedule_type)
    docs = qs.order_by("-created_at")
    return CampaignListOut(total=docs.count(), items=[CampaignOut.from_doc(d) for d in docs])

class DeliveryStatsOut(BaseModel):
    total_sent: int
    total_failed: int
    total_skipped: int
    delivered_rate: float


@router.get("/stats/delivery", response_model=DeliveryStatsOut)
def get_delivery_stats(_user: str = Depends(get_current_user)):
    """
    Aggregate delivery stats across ALL campaigns, from real EmailLog entries.
    Returns 0% honestly until real sends start happening.
    """
    total_sent = EmailLog.objects(status="sent").count()
    total_failed = EmailLog.objects(status="failed").count()
    total_skipped = EmailLog.objects(status="skipped_unsubscribed").count()

    attempted = total_sent + total_failed
    delivered_rate = round((total_sent / attempted) * 100, 1) if attempted > 0 else 0.0

    return DeliveryStatsOut(
        total_sent=total_sent,
        total_failed=total_failed,
        total_skipped=total_skipped,
        delivered_rate=delivered_rate,
    )
class SendResultOut(BaseModel):
    sent: int
    failed: int
    skipped: int
    total_recipients: int


def _resolve_recipients(recipients_filter: dict) -> list:
    """Turns a campaign's recipients filter into a real Contact queryset,
    always excluding unsubscribed contacts regardless of filter type."""
    rtype = recipients_filter.get("type", "all")
    rvalue = recipients_filter.get("value")

    qs = Contact.objects(status="active")  # never send to unsubscribed, ever

    if rtype == "batch" and rvalue:
        qs = qs.filter(batch=rvalue)
    elif rtype == "course" and rvalue:
        qs = qs.filter(course=rvalue)
    # rtype == "all" — no additional filter, every active contact

    return list(qs)


@router.post("/{campaign_id}/send", response_model=SendResultOut)
def send_campaign(campaign_id: str, _user: str = Depends(get_current_user)):
    campaign = _get_or_404(campaign_id)

    if campaign.status not in ("draft", "scheduled"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot send a campaign with status '{campaign.status}'",
        )

    contacts = _resolve_recipients(campaign.recipients)
    if not contacts:
        raise HTTPException(status_code=422, detail="No matching active recipients found for this campaign")

    campaign.status = "sending"
    campaign.save()

    contacts_by_email = {c.email: c for c in contacts}
    recipients_payload = [
        {"email": c.email, "contact_id": str(c.id)} for c in contacts
    ]

    def render_for_recipient(r):
        contact = contacts_by_email[r["email"]]
        context = {
            "name": contact.name,
            "email": contact.email,
            "batch": contact.batch or "",
            "course": contact.course or "",
        }
        subject = render_body(campaign.template.subject, context)
        body = render_body(campaign.template.body, context)
        return subject, body

    result = send_bulk_emails(
        recipients=recipients_payload,
        render_fn=render_for_recipient,
        campaign_id=str(campaign.id),
    )

    campaign.status = "sent" if result["failed"] == 0 else "failed"
    campaign.save()
    notify(
        "campaign_sent" if result["failed"] == 0 else "campaign_failed",
        f"Campaign '{campaign.name}' {'sent' if result['failed'] == 0 else 'had failures'}",
        f"Sent: {result['sent']}, Failed: {result['failed']}, Skipped: {result['skipped']}",
    )
    return SendResultOut(
        sent=result["sent"],
        failed=result["failed"],
        skipped=result["skipped"],
        total_recipients=len(contacts),
    )
    

@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: str, _user: str = Depends(get_current_user)):
    return CampaignOut.from_doc(_get_or_404(campaign_id))


@router.post("", response_model=CampaignOut, status_code=201)
def create_campaign(payload: CampaignCreate, _user: str = Depends(get_current_user)):
    snapshot = _build_snapshot(payload.template_id)

    try:
        doc = Campaign(
            name=payload.name,
            template=snapshot,
            recipients=payload.recipients.dict(),
            schedule_type=payload.schedule_type or "now",
            schedule_at=payload.schedule_at,
            status="scheduled" if payload.schedule_type != "now" else "draft",
        )
        doc.save()
    except MEValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return CampaignOut.from_doc(doc)


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: str, payload: CampaignUpdate, _user: str = Depends(get_current_user)):
    doc = _get_or_404(campaign_id)

    if doc.status not in ("draft", "scheduled"):
        raise HTTPException(status_code=409, detail=f"Cannot edit a campaign with status '{doc.status}'")

    update_fields = payload.dict(exclude_unset=True)

    if "template_id" in update_fields:
        doc.template = _build_snapshot(update_fields.pop("template_id"))
    if "recipients" in update_fields:
        doc.recipients = update_fields.pop("recipients")

    for field, value in update_fields.items():
        setattr(doc, field, value)

    try:
        doc.save()
    except MEValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return CampaignOut.from_doc(doc)


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(campaign_id: str, _user: str = Depends(get_current_user)):
    doc = _get_or_404(campaign_id)
    if doc.status == "sending":
        raise HTTPException(status_code=409, detail="Cannot delete a campaign that is currently sending")
    doc.delete()
    return None


def _get_or_404(campaign_id: str) -> Campaign:
    doc = Campaign.objects(id=campaign_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return doc