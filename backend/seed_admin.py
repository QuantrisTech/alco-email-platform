import os
from dotenv import load_dotenv
load_dotenv()
from database import connect_db
connect_db()
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

email = "admin@alco.com"
password = "admin@123"

if User.objects(email=email).first():
    print("Admin already exists")
else:
    User(email=email, password_hash=pwd_context.hash(password), name="Admin", role="admin").save()
    print("Admin created")