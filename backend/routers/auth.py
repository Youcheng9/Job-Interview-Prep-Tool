# backend/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from backend.models.db import get_db
from backend.models.models import User
from backend.schemas.auth import RegisterRequest, AuthResponse
from backend.auth import hash_password, create_access_token
from backend.auth import verify_password
from backend.schemas.auth import LoginRequest


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user.

    Steps:
    1. Check if email already exists
    2. Hash password
    3. Save user
    4. Create JWT
    5. Return token
    """

    # 1️. Check if email already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2️. Hash password securely
    password_hash = hash_password(payload.password)

    # 3️. Create and save user
    user = User(
        email=payload.email,
        password_hash=password_hash,
    )

    db.add(user)
    db.commit()

    # 4. Create JWT token
    token = create_access_token(user.email)

    # 5️. Return token
    return AuthResponse(access_token=token)




@router.post("/login", response_model=AuthResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2-compatible login endpoint.

    Swagger UI's Authorize button uses this flow:
    - It sends form fields: username, password
    - We treat username as the user's email
    """
    # Swagger calls it "username", but we're using email as the username
    email = form_data.username
    password = form_data.password

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.email)
    return AuthResponse(access_token=token)