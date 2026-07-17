import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext

from schemas import LoginRequest, TokenResponse, RegisterRequest, UserOut
from models import User

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 480))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


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
    user = User.objects(email=req.email).first()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return TokenResponse(access_token=create_access_token(user.email))

@router.get("/me", response_model=UserOut)
def get_me(current_user_email: str = Depends(get_current_user)):
    user = User.objects(email=current_user_email).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=str(user.id), email=user.email, name=user.name, role=user.role)

@router.post("/register", response_model=UserOut, status_code=201)
def register(req: RegisterRequest, _admin: str = Depends(get_current_user)):
    # Only an already-authenticated user can create new users.
    # This prevents open self-signup on an internal tool.
    if User.objects(email=req.email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    if len(req.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=422, detail="Password exceeds 72-byte limit")

    user = User(
        email=req.email,
        password_hash=pwd_context.hash(req.password),
        name=req.name,
        role=req.role or "editor",
    ).save()

    return UserOut(id=str(user.id), email=user.email, name=user.name, role=user.role)