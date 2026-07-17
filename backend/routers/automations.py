from datetime import datetime
from typing import Optional, List, Any

from fastapi import APIRouter, HTTPException, Depends, Query
from mongoengine.errors import ValidationError as MEValidationError
from pydantic import BaseModel

from models import Automation, Template, TemplateSnapshot
from routers.auth import get_current_user

router = APIRouter(prefix="/automations", tags=["automations"])


class AutomationCreate(BaseModel):
    name: str
    trigger_type: str  # "new_contact_webhook" | "schedule" | "manual"
    trigger_config: Optional[dict] = {}
    template_id: str
    is_active: Optional[bool] = False


class AutomationUpdate(BaseModel):
    name: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[dict] = None
    template_id: Optional[str] = None
    is_active: Optional[bool] = None


class TemplateSnapshotOut(BaseModel):
    template_id: Optional[str] = None
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None


class AutomationOut(BaseModel):
    id: str
    name: str
    trigger_type: str
    trigger_config: dict
    template: TemplateSnapshotOut
    is_active: bool
    created_at: datetime

    @staticmethod
    def from_doc(doc: Automation) -> "AutomationOut":
        return AutomationOut(
            id=str(doc.id),
            name=doc.name,
            trigger_type=doc.trigger_type,
            trigger_config=doc.trigger_config,
            template=TemplateSnapshotOut(
                template_id=doc.template.template_id,
                name=doc.template.name,
                subject=doc.template.subject,
                body=doc.template.body,
            ),
            is_active=doc.is_active,
            created_at=doc.created_at,
        )


class AutomationListOut(BaseModel):
    total: int
    items: List[AutomationOut]


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


@router.get("", response_model=AutomationListOut)
def list_automations(
    trigger_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    _user: str = Depends(get_current_user),
):
    qs = Automation.objects
    if trigger_type:
        qs = qs.filter(trigger_type=trigger_type)
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    docs = qs.order_by("-created_at")
    return AutomationListOut(total=docs.count(), items=[AutomationOut.from_doc(d) for d in docs])


@router.get("/{automation_id}", response_model=AutomationOut)
def get_automation(automation_id: str, _user: str = Depends(get_current_user)):
    return AutomationOut.from_doc(_get_or_404(automation_id))


@router.post("", response_model=AutomationOut, status_code=201)
def create_automation(payload: AutomationCreate, _user: str = Depends(get_current_user)):
    snapshot = _build_snapshot(payload.template_id)
    try:
        doc = Automation(
            name=payload.name,
            trigger_type=payload.trigger_type,
            trigger_config=payload.trigger_config or {},
            template=snapshot,
            is_active=payload.is_active or False,
        )
        doc.save()
    except MEValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return AutomationOut.from_doc(doc)


@router.patch("/{automation_id}", response_model=AutomationOut)
def update_automation(automation_id: str, payload: AutomationUpdate, _user: str = Depends(get_current_user)):
    doc = _get_or_404(automation_id)
    update_fields = payload.dict(exclude_unset=True)

    if "template_id" in update_fields:
        doc.template = _build_snapshot(update_fields.pop("template_id"))

    for field, value in update_fields.items():
        setattr(doc, field, value)

    try:
        doc.save()
    except MEValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return AutomationOut.from_doc(doc)


@router.delete("/{automation_id}", status_code=204)
def delete_automation(automation_id: str, _user: str = Depends(get_current_user)):
    _get_or_404(automation_id).delete()
    return None


def _get_or_404(automation_id: str) -> Automation:
    doc = Automation.objects(id=automation_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Automation not found")
    return doc