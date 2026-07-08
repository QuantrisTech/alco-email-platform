import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext

from schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 480))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Team login store — replace with a proper `users` table before adding a
# second team member; a single shared credential has no audit trail for
# who actually sent a campaign.
#
# ADMIN_PASSWORD is a SEPARATE credential from JWT_SECRET, on purpose.
# JWT_SECRET is a signing key: arbitrary length, never typed by a human,
# never passed to bcrypt. ADMIN_PASSWORD is an actual login password:
# bounded length, meant to be typed. Hashing JWT_SECRET as a password was
# the bug that crashed this file — bcrypt hard-caps input at 72 bytes and
# a properly long signing secret blows past that. Don't reintroduce this
# by pointing ADMIN_PASSWORD back at JWT_SECRET.
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD is not set — check your .env file")
if len(ADMIN_PASSWORD.encode("utf-8")) > 72:
    raise RuntimeError("ADMIN_PASSWORD exceeds bcrypt's 72-byte limit — use a shorter password")

_FAKE_USER_DB = {
    os.getenv("SMTP_EMAIL", "admin@alco.com"): pwd_context.hash(ADMIN_PASSWORD)
}


def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": subject, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    hashed = _FAKE_USER_DB.get(req.email)
    if not hashed or not pwd_context.verify(req.password, hashed):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return TokenResponse(access_token=create_access_token(req.email))
