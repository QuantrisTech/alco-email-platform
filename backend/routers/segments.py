from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from models import Segment, Contact
from routers.auth import get_current_user

router = APIRouter(prefix="/segments", tags=["segments"])


class SegmentCreate(BaseModel):
    name: str
    rules: Dict[str, Any]  # e.g. {"status": "active", "batch": "2027"}


class SegmentOut(BaseModel):
    id: str
    name: str
    rules: dict
    contact_count: int
    created_at: datetime

    @staticmethod
    def from_doc(doc: Segment) -> "SegmentOut":
        return SegmentOut(
            id=str(doc.id), name=doc.name, rules=doc.rules,
            contact_count=_count_matching(doc.rules), created_at=doc.created_at,
        )


class SegmentListOut(BaseModel):
    items: List[SegmentOut]


def _count_matching(rules: dict) -> int:
    """Re-evaluates the segment's rules against LIVE contact data every
    time it's read — this is what makes it 'self-updating': there's no
    stored member list to go stale, membership is computed fresh."""
    query = {}
    for key, value in rules.items():
        if key in ("status", "batch", "course"):
            query[key] = value
    return Contact.objects(**query).count()


@router.get("", response_model=SegmentListOut)
def list_segments(_user: str = Depends(get_current_user)):
    docs = Segment.objects.order_by("-created_at")
    return SegmentListOut(items=[SegmentOut.from_doc(d) for d in docs])


@router.post("", response_model=SegmentOut, status_code=201)
def create_segment(payload: SegmentCreate, _user: str = Depends(get_current_user)):
    doc = Segment(name=payload.name, rules=payload.rules).save()
    return SegmentOut.from_doc(doc)


@router.get("/{segment_id}/contacts")
def get_segment_contacts(segment_id: str, _user: str = Depends(get_current_user)):
    doc = Segment.objects(id=segment_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    query = {k: v for k, v in doc.rules.items() if k in ("status", "batch", "course")}
    contacts = Contact.objects(**query)
    return {"total": contacts.count(), "items": [{"id": str(c.id), "name": c.name, "email": c.email} for c in contacts]}


@router.delete("/{segment_id}", status_code=204)
def delete_segment(segment_id: str, _user: str = Depends(get_current_user)):
    doc = Segment.objects(id=segment_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    doc.delete()
    return None