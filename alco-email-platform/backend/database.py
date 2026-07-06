import os
import mongoengine as me
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not set — check your .env file")


def connect_db():
    """Call once at app startup. Mongoengine manages a single global
    connection registry — do not call me.connect() more than once per
    process or you'll get duplicate-alias errors."""
    me.connect(host=MONGO_URI, alias="default")
