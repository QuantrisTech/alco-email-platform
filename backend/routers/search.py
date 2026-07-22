from typing import List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from models import Contact, Template, Campaign
from routers.auth import get_current_user

router = APIRouter(prefix="/search", tags=["search"])


class SearchResultItem(BaseModel):
    type: str  # "contact" | "template" | "campaign"
    id: str
    title: str
    subtitle: str


class SearchResultsOut(BaseModel):
    items: List[SearchResultItem]


@router.get("", response_model=SearchResultsOut)
def global_search(q: str = Query(..., min_length=1), _user: str = Depends(get_current_user)):
    results = []

    for c in Contact.objects(name__icontains=q)[:5]:
        results.append(SearchResultItem(type="contact", id=str(c.id), title=c.name, subtitle=c.email))
    for c in Contact.objects(email__icontains=q)[:5]:
        if not any(r.id == str(c.id) for r in results):
            results.append(SearchResultItem(type="contact", id=str(c.id), title=c.name, subtitle=c.email))

    for t in Template.objects(name__icontains=q)[:5]:
        results.append(SearchResultItem(type="template", id=str(t.id), title=t.name, subtitle=t.subject))

    for cmp in Campaign.objects(name__icontains=q)[:5]:
        results.append(SearchResultItem(type="campaign", id=str(cmp.id), title=cmp.name, subtitle=cmp.status))

    return SearchResultsOut(items=results[:15])