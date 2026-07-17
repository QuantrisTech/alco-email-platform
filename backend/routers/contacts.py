from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Query
from mongoengine.errors import NotUniqueError, ValidationError as MEValidationError
from pydantic import BaseModel, EmailStr

from models import Contact
from routers.auth import get_current_user

router = APIRouter(prefix="/contacts", tags=["contacts"])


# ---------- Schemas ----------
# Kept local to this router for now. Move into schemas.py if other routers
# (e.g. crm_sync.py) end up needing the same shapes.

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    batch: Optional[str] = None
    course: Optional[str] = None
    status: Optional[str] = "active"


class ContactUpdate(BaseModel):
    # All optional — PATCH-style partial update, not a full PUT replace.
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    batch: Optional[str] = None
    course: Optional[str] = None
    status: Optional[str] = None


class ContactOut(BaseModel):
    id: str
    name: str
    email: str
    batch: Optional[str] = None
    course: Optional[str] = None
    status: str
    created_at: datetime

    @staticmethod
    def from_doc(doc: Contact) -> "ContactOut":
        return ContactOut(
            id=str(doc.id),
            name=doc.name,
            email=doc.email,
            batch=doc.batch,
            course=doc.course,
            status=doc.status,
            created_at=doc.created_at,
        )


class ContactListOut(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ContactOut]


# ---------- Routes ----------

@router.get("", response_model=ContactListOut)
def list_contacts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    batch: Optional[str] = None,
    course: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = Query(None, description="Matches against name or email"),
    _user: str = Depends(get_current_user),
):
    qs = Contact.objects

    if batch:
        qs = qs.filter(batch=batch)
    if course:
        qs = qs.filter(course=course)
    if status:
        qs = qs.filter(status=status)
    if search:
        # __icontains on both fields, OR'd together via raw Q if needed later.
        # Simple version for now: search matches name OR email case-insensitively.
        from mongoengine.queryset.visitor import Q
        qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search))

    total = qs.count()
    skip = (page - 1) * page_size
    docs = qs.order_by("-created_at").skip(skip).limit(page_size)

    return ContactListOut(
        total=total,
        page=page,
        page_size=page_size,
        items=[ContactOut.from_doc(d) for d in docs],
    )


@router.get("/{contact_id}", response_model=ContactOut)
def get_contact(contact_id: str, _user: str = Depends(get_current_user)):
    doc = _get_or_404(contact_id)
    return ContactOut.from_doc(doc)


@router.post("", response_model=ContactOut, status_code=201)
def create_contact(payload: ContactCreate, _user: str = Depends(get_current_user)):
    doc = Contact(
        name=payload.name,
        email=payload.email,
        batch=payload.batch,
        course=payload.course,
        status=payload.status or "active",
    )
    try:
        doc.save()
    except NotUniqueError:
        raise HTTPException(status_code=409, detail="A contact with this email already exists")
    except MEValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return ContactOut.from_doc(doc)


@router.patch("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: str, payload: ContactUpdate, _user: str = Depends(get_current_user)):
    doc = _get_or_404(contact_id)

    update_fields = payload.dict(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(doc, field, value)

    try:
        doc.save()
    except NotUniqueError:
        raise HTTPException(status_code=409, detail="A contact with this email already exists")
    except MEValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return ContactOut.from_doc(doc)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: str, _user: str = Depends(get_current_user)):
    doc = _get_or_404(contact_id)
    doc.delete()
    return None


# ---------- Helpers ----------

def _get_or_404(contact_id: str) -> Contact:
    doc = Contact.objects(id=contact_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return doc