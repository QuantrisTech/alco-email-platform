# AL&CO Email Automation Platform

Internal email automation platform for Arslan Larik & Company — contacts, templates, campaigns, automations, and CRM sync.

## Architecture notes (read before extending)

- **Database is MongoDB** (mongoengine ODM), matching the existing CRM's engine so both live in one Atlas cluster, in separate databases. Mongo has no foreign key enforcement — `Campaign.template` and `Automation.template` **embed a frozen `TemplateSnapshot`** taken at creation time rather than referencing `Template` by ID. Editing a `Template` later does NOT change campaigns/automations already using it. If live-linked templates are ever wanted instead (edit propagates everywhere it's used), that's a schema change to `models.py`, not a config toggle.
- `EmailLog.campaign_id` / `contact_id` are plain string IDs with no referential integrity — a campaign or contact can be deleted while logs referencing it still exist. Any analytics/history view must handle a missing lookup gracefully.
- **SMTP transport is Gmail**, capped at `SMTP_DAILY_LIMIT` (default 450/day) to stay under Gmail's undocumented bulk-send suspension threshold. The daily counter is in-process memory — fine for a single worker process, but if Railway ever runs multiple instances, each gets its own counter and the cap gets silently bypassed. Move to a Mongo-backed counter document (atomic `$inc`) before scaling to multiple workers.
- **Unsubscribe links are HMAC-signed** (`UNSUB_SECRET`) over `(email, campaign_id)`. Never change `/unsubscribe` to accept an unsigned email param — it becomes spoofable and vulnerable to link-scanner false-triggers (Outlook Safe Links, corporate gateways pre-fetching URLs).
- **Scheduler uses a Mongo-backed job store** (`MongoDBJobStore`), not in-memory. Scheduled/recurring campaigns survive Railway restarts and redeploys. Job IDs are deterministic (`campaign_{id}`, `automation_{id}`) so re-registering on startup doesn't duplicate jobs. Both `scheduler.py` and `email_sender.py` call `load_dotenv()` independently — don't remove this, it was a real bug: importing either module before `main.py`'s own `load_dotenv()` runs left `MONGO_URI` unset and crashed on connection.
- **Auth is single-shared-credential JWT.** Fine for one operator; before adding a second team member, replace `_FAKE_USER_DB` in `routers/auth.py` with a real `users` collection — there's currently no per-user audit trail on who sent what.
- **CRM webhook endpoint (automations) must validate `CRM_WEBHOOK_SECRET`** on every inbound call once built — an unauthenticated webhook lets anyone trigger a welcome-email automation for an arbitrary email address.

## Local setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in real values
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment variables

See `backend/.env.example`. Two secrets are load-bearing and must be long random strings, not placeholders:
- `JWT_SECRET` — session auth
- `UNSUB_SECRET` — unsubscribe link signing (keep separate from `JWT_SECRET` so rotating one doesn't invalidate the other)

## Deployment

- Backend → Railway (set `MONGO_URI` to your Atlas connection string as an environment variable — no plugin needed since Atlas is external, unlike the Postgres-plugin approach)
- Frontend → Vercel (set `VITE_API_URL` to the Railway backend URL once the frontend makes real API calls)

## Build status

Scaffolded: project structure, Mongo document models with embedded-template-snapshot pattern, FastAPI app with startup-triggered Mongo connection, Mongo-backed scheduler, signed-unsubscribe email sender, JWT login route, React shell with sidebar/topbar navigation.

Verified so far (see git history / build log): all modules import cleanly with real mongoengine/pymongo installs, `Contact` and `Campaign` documents (including the embedded `TemplateSnapshot`) validate correctly, unsubscribe token signing/verification round-trips correctly, and the scheduler correctly resolves the target database name from `MONGO_URI`. Not yet verified: an actual live write against a real Atlas cluster — that requires your real credentials.

Not yet built (pending confirmation per feature, in this order): Contacts CRUD + CRM sync → Templates → Campaign composer + bulk sender → Automations → Unsubscribe endpoint (wired to the already-built signing logic) → Analytics.
