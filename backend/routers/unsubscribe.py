"""
Public unsubscribe endpoint — no authentication required, since this is
a link clicked directly from an email inbox. Legitimacy is proven by the
HMAC-signed token instead of a JWT (see services/email_sender.py for how
the token is generated and signed).
"""
from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse

from models import Contact
from services.email_sender import verify_unsubscribe_token

router = APIRouter(tags=["unsubscribe"])


def _page(title: str, message: str) -> str:
    """Minimal, dependency-free HTML response — this endpoint is hit
    directly by a browser, not by the frontend app, so it renders its
    own tiny page rather than returning JSON."""
    return f"""
    <html>
      <head><title>{title}</title></head>
      <body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center; color: #071C43;">
        <h2>{title}</h2>
        <p>{message}</p>
      </body>
    </html>
    """


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(email: str = Query(...), campaign_id: str = Query("0"), token: str = Query(...)):
    if not verify_unsubscribe_token(email, campaign_id, token):
        return HTMLResponse(
            _page("Invalid Link", "This unsubscribe link is invalid or has expired."),
            status_code=400,
        )

    contact = Contact.objects(email=email).first()
    if contact is None:
        # Don't reveal whether the email exists in our system either way —
        # show success regardless, since the token was valid.
        return HTMLResponse(_page("Unsubscribed", "You have been unsubscribed successfully."))

    contact.status = "unsubscribed"
    contact.save()

    return HTMLResponse(_page("Unsubscribed", f"{email} has been unsubscribed and will no longer receive emails from us."))