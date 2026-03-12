# backend/auth.py
"""
Auth helpers:
- Hash + verify passwords (bcrypt)
- Create JWT access tokens

We use bcrypt directly (no passlib) to avoid version/compat issues.
"""

from datetime import datetime, timedelta, timezone
import os

import bcrypt
from jose import jwt


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.

    Notes:
    - bcrypt works on bytes, so we encode strings.
    - bcrypt only uses the first 72 bytes of the password.
      We'll enforce that limit so behavior is predictable.
    """
    pwd_bytes = password.encode("utf-8")

    if len(pwd_bytes) > 72:
        # This is a bcrypt limitation. Better to reject than silently truncate.
        raise ValueError("Password too long (bcrypt max is 72 bytes).")

    salt = bcrypt.gensalt()  # default cost is fine for an MVP
    hashed = bcrypt.hashpw(pwd_bytes, salt)

    # Store as text in the DB
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a stored bcrypt hash.
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(email: str) -> str:
    """
    Create a JWT access token.

    Payload:
    - sub: user identity (email)
    - exp: expiration time
    """
    secret = os.getenv("JWT_SECRET")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    if not secret:
        raise RuntimeError("JWT_SECRET is not set. Put it in backend/.env.")

    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)

    payload = {"sub": email, "exp": expire}
    return jwt.encode(payload, secret, algorithm=algorithm)