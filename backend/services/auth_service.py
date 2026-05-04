from datetime import datetime, timedelta
import hashlib
import os
import secrets

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.auth import create_access_token, hash_password, verify_password
from backend.emailer import send_password_reset_email
from backend.models.models import PasswordResetToken, User
from backend.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
)

FORGOT_PASSWORD_GENERIC_MESSAGE = "If that account exists, a password reset link has been sent."


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

    def forgot_password(self, payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
        user = self.db.query(User).filter(User.email == payload.email).first()
        if not user:
            return ForgotPasswordResponse(message=FORGOT_PASSWORD_GENERIC_MESSAGE)

        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_reset_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(minutes=int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "30")))

        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": datetime.utcnow()}, synchronize_session=False)

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(reset_token)
        self.db.commit()

        base_url = os.getenv("PASSWORD_RESET_URL_BASE", "http://localhost:5173/auth?mode=reset")
        separator = "&" if "?" in base_url else "?"
        reset_url = f"{base_url}{separator}token={raw_token}"
        send_password_reset_email(recipient=user.email, reset_url=reset_url)

        return ForgotPasswordResponse(message=FORGOT_PASSWORD_GENERIC_MESSAGE)

    def reset_password(self, payload: ResetPasswordRequest) -> ResetPasswordResponse:
        token_hash = self._hash_reset_token(payload.token)
        token = (
            self.db.query(PasswordResetToken)
            .filter(PasswordResetToken.token_hash == token_hash)
            .first()
        )
        if not token or token.used_at is not None or token.expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Reset link is invalid or has expired")

        user = self.db.query(User).filter(User.id == token.user_id).first()
        if not user:
            raise HTTPException(status_code=400, detail="Reset link is invalid or has expired")

        try:
            user.password_hash = hash_password(payload.new_password)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        token.used_at = datetime.utcnow()
        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": datetime.utcnow()}, synchronize_session=False)
        self.db.add(user)
        self.db.commit()

        return ResetPasswordResponse(message="Password reset successful. Please sign in with your new password.")

    def _hash_reset_token(self, raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
