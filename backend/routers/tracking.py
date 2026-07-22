from fastapi import APIRouter, Response
from models import EmailLog

router = APIRouter(tags=["tracking"])

# 1x1 transparent GIF, served on every open
PIXEL = bytes.fromhex(
    "47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b"
)


@router.get("/track/open/{log_id}")
def track_open(log_id: str):
    log = EmailLog.objects(id=log_id).first()
    if log and not log.opened:
        log.opened = True
        log.save()
    return Response(content=PIXEL, media_type="image/gif")


@router.get("/track/click/{log_id}")
def track_click(log_id: str, url: str):
    from fastapi.responses import RedirectResponse
    log = EmailLog.objects(id=log_id).first()
    if log and not log.clicked:
        log.clicked = True
        log.save()
    return RedirectResponse(url=url)