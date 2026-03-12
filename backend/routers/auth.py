# backend/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Login an existing user.

    Steps:
    1. Find user by email
    2. Verify password
    3. If valid → return JWT
    """

    # 1️. Find user
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 2️. Verify password
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 3️. Generate token
    token = create_access_token(user.email)

    return AuthResponse(access_token=token)