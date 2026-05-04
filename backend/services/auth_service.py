from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.auth import create_access_token, hash_password, verify_password
from backend.models.models import User
from backend.schemas.auth import AuthResponse, RegisterRequest


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, payload: RegisterRequest) -> AuthResponse:
        existing_user = self.db.query(User).filter(User.email == payload.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        try:
            password_hash = hash_password(payload.password)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        user = User(
            email=payload.email,
            password_hash=password_hash,
        )
        self.db.add(user)
        self.db.commit()

        return AuthResponse(access_token=create_access_token(user.email))

    def login(self, email: str, password: str) -> AuthResponse:
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return AuthResponse(access_token=create_access_token(user.email))
