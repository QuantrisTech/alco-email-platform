from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Query
from mongoengine.errors import ValidationError as MEValidationError
from pydantic import BaseModel

from models import Template
from routers.auth import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    variables: Optional[List[str]] = []


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    variables: Optional[List[str]] = None


class TemplateOut(BaseModel):
    id: str
    name: str
    subject: str
    body: str
    variables: List[str]
    created_at: datetime

    @staticmethod
    def from_doc(doc: Template) -> "TemplateOut":
        return TemplateOut(
            id=str(doc.id),
            name=doc.name,
            subject=doc.subject,
            body=doc.body,
            variables=doc.variables,
            created_at=doc.created_at,
        )


class TemplateListOut(BaseModel):
    total: int
    items: List[TemplateOut]


@router.get("", response_model=TemplateListOut)
def list_templates(search: Optional[str] = Query(None), _user: str = Depends(get_current_user)):
    qs = Template.objects
    if search:
        qs = qs.filter(name__icontains=search)
    docs = qs.order_by("-created_at")
    return TemplateListOut(total=docs.count(), items=[TemplateOut.from_doc(d) for d in docs])


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(template_id: str, _user: str = Depends(get_current_user)):
    return TemplateOut.from_doc(_get_or_404(template_id))


@router.post("", response_model=TemplateOut, status_code=201)
def create_template(payload: TemplateCreate, _user: str = Depends(get_current_user)):
    try:
        doc = Template(
            name=payload.name,
            subject=payload.subject,
            body=payload.body,
            variables=payload.variables or [],
        )
        doc.save()
    except MEValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return TemplateOut.from_doc(doc)


@router.patch("/{template_id}", response_model=TemplateOut)
def update_template(template_id: str, payload: TemplateUpdate, _user: str = Depends(get_current_user)):
    doc = _get_or_404(template_id)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(doc, field, value)
    try:
        doc.save()
    except MEValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return TemplateOut.from_doc(doc)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, _user: str = Depends(get_current_user)):
    _get_or_404(template_id).delete()
    return None


def _get_or_404(template_id: str) -> Template:
    doc = Template.objects(id=template_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return doc