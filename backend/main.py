from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import connect_db
from routers import auth
from services.scheduler import start_scheduler

app = FastAPI(title="AL&CO Email Automation Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the Vercel frontend origin before production
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
# app.include_router(contacts.router)
# app.include_router(templates.router)
# app.include_router(campaigns.router)
# app.include_router(automations.router)
