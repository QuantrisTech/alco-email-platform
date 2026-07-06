from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ---------- Contacts ----------

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    batch: Optional[str] = None
    course: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    batch: Optional[str] = None
    course: Optional[str] = None
    status: Optional[str] = None  # "active" | "unsubscribed"


class ContactOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    batch: Optional[str] = None
    course: Optional[str] = None
    status: str
    created_at: datetime


# ---------- Templates ----------

class TemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    variables: List[str] = []


class TemplateOut(TemplateCreate):
    id: str
    created_at: datetime


# ---------- Campaigns ----------

class CampaignCreate(BaseModel):
    name: str
    template_id: str
    recipients: Dict[str, Any]
    schedule_type: str = "now"
    schedule_at: Optional[datetime] = None


class CampaignOut(CampaignCreate):
    id: str
    status: str
    created_at: datetime


# ---------- Email Logs ----------

class EmailLogOut(BaseModel):
    id: str
    campaign_id: Optional[str] = None
    contact_email: EmailStr
    status: str
    error: Optional[str] = None
    sent_at: datetime


# ---------- Automations ----------

class AutomationCreate(BaseModel):
    name: str
    trigger_type: str
    trigger_config: Dict[str, Any] = {}
    template_id: str
    is_active: bool = False


class AutomationOut(AutomationCreate):
    id: str
    created_at: datetime


# ---------- Auth ----------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Helper ----------

def doc_to_out(doc: dict) -> dict:
    """Mongo docs use `_id` (ObjectId); API responses use `id` (str).
    Every router handler should pass results through this before
    returning, or the frontend gets a non-JSON-serializable ObjectId."""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc
