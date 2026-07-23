from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import connect_db
from routers import auth
from services.scheduler import start_scheduler
from routers.contacts import router as contacts_router
from routers.templates import router as templates_router
from routers.campaigns import router as campaigns_router
from routers.automations import router as automations_router
from routers.unsubscribe import router as unsubscribe_router
from routers.notifications import router as notifications_router
from routers.webhooks import router as webhooks_router
from routers.search import router as search_router
from routers.tracking import router as tracking_router
from routers.segments import router as segments_router


app = FastAPI(title="AL&CO Email Automation Platform")



app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://alco-email-platform.onrender.com", "https://alco-email-platform.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Mongo is schemaless — no migration/create_all step. mongoengine
    # creates each Document's declared indexes on first use automatically.
    connect_db()
    start_scheduler()
    # TODO once campaigns/automations routers exist: re-register any
    # persisted scheduled jobs whose run_date is in the future. The
    # MongoDBJobStore already restores them automatically on scheduler
    # start, so this is a no-op today — noting it so it isn't forgotten
    # when the campaigns router is built.


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
# Registered as each feature is built and confirmed:

app.include_router(contacts_router)
app.include_router(templates_router)
app.include_router(campaigns_router)
app.include_router(automations_router)
app.include_router(unsubscribe_router)
app.include_router(notifications_router)
app.include_router(webhooks_router)
app.include_router(search_router)
app.include_router(tracking_router)
app.include_router(segments_router)