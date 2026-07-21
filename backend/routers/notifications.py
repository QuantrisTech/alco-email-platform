from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models import Notification
from routers.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    message: str
    read: bool
    created_at: datetime

    @staticmethod
    def from_doc(doc: Notification) -> "NotificationOut":
        return NotificationOut(
            id=str(doc.id), type=doc.type, title=doc.title,
            message=doc.message, read=doc.read, created_at=doc.created_at,
        )


class NotificationListOut(BaseModel):
    unread_count: int
    items: List[NotificationOut]


@router.get("", response_model=NotificationListOut)
def list_notifications(_user: str = Depends(get_current_user)):
    docs = Notification.objects.order_by("-created_at").limit(30)
    unread_count = Notification.objects(read=False).count()
    return NotificationListOut(
        unread_count=unread_count,
        items=[NotificationOut.from_doc(d) for d in docs],
    )


@router.post("/{notification_id}/read", status_code=204)
def mark_read(notification_id: str, _user: str = Depends(get_current_user)):
    doc = Notification.objects(id=notification_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    doc.read = True
    doc.save()
    return None


@router.post("/read-all", status_code=204)
def mark_all_read(_user: str = Depends(get_current_user)):
    Notification.objects(read=False).update(read=True)
    return None