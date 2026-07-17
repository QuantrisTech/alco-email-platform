"""
crm_sync.py — Pulls contacts from the CRM's MongoDB (read-only, separate
cluster/project) into this platform's own Contact collection.

Chain: user -> found in a batch's `students` array -> batch.name +
batch.program_id -> course.title (matched by program_id).

Run manually for now: python crm_sync.py
(Wire this into the scheduler once you're happy with a manual test run.)
"""

import os
import re
from dotenv import load_dotenv
load_dotenv()

from pymongo import MongoClient
from mongoengine.errors import ValidationError as MEValidationError

from database import connect_db
from models import Contact


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")

CRM_MONGO_URI = os.getenv("CRM_MONGO_URI")
if not CRM_MONGO_URI:
    raise RuntimeError("CRM_MONGO_URI is not set — check your .env file")


def sync_contacts_from_crm():
    connect_db()

    crm_client = MongoClient(CRM_MONGO_URI)
    crm_db = crm_client.get_default_database()

    users_col = crm_db["users"]
    batches_col = crm_db["batches"]
    courses_col = crm_db["courses"]

    user_to_batch = {}
    for batch in batches_col.find({}, {"name": 1, "program_id": 1, "students": 1}):
        batch_name = batch.get("name")
        program_id = batch.get("program_id")
        for student_id in batch.get("students", []):
            user_to_batch[str(student_id)] = {
                "batch_name": batch_name,
                "program_id": program_id,
            }

    program_to_course = {}
    for course in courses_col.find({}, {"program_id": 1, "title": 1}):
        program_to_course[str(course.get("program_id"))] = course.get("title")

    created, updated, skipped = 0, 0, 0

    for user in users_col.find({"role": "user"}):
        email = user.get("email")
        name = user.get("name")

        if not email or not name or not EMAIL_RE.match(email):
            skipped += 1
            continue

        batch_info = user_to_batch.get(str(user["_id"]))
        batch_name = batch_info["batch_name"] if batch_info else None
        course_title = (
            program_to_course.get(str(batch_info["program_id"]))
            if batch_info else None
        )

        status = "active" if user.get("isActive", True) else "unsubscribed"

        try:
            existing = Contact.objects(email=email).first()
            if existing:
                existing.name = name
                existing.batch = batch_name
                existing.course = course_title
                existing.status = status
                existing.save()
                updated += 1
            else:
                Contact(
                    name=name,
                    email=email,
                    batch=batch_name,
                    course=course_title,
                    status=status,
                ).save()
                created += 1
        except MEValidationError as e:
            print(f"Skipped {email}: {e}")
            skipped += 1

    crm_client.close()
    print(f"CRM sync complete: {created} created, {updated} updated, {skipped} skipped")


if __name__ == "__main__":
    sync_contacts_from_crm()