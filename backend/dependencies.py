# backend/dependencies.py
"""
FastAPI dependencies are reusable pieces of logic we can attach to routes.

This one reads the JWT from the Authorization header and returns the
corresponding User from the database.
"""

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from backend.models.db import get_db
from backend.models.models import User

# This tells FastAPI: "look for Authorization: Bearer <token>"
# tokenUrl points to the login endpoint used to get tokens.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    1) Decode the JWT
    2) Extract the email from the token (we stored it in 'sub')
    3) Look up that user in the database
    4) Return the User object (or raise 401 if anything is wrong)
    """
    secret = os.getenv("JWT_SECRET")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    if not secret:
        # This is a config problem, not a user problem
        raise RuntimeError("JWT_SECRET missing. Put it in backend/.env")

    # Reusable 401 error
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        email = payload.get("sub")  # we set sub=email when creating the token
        if not email:
            raise unauthorized
    except JWTError:
        # token is invalid / expired / tampered with
        raise unauthorized

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # token may be valid, but user no longer exists
        raise unauthorized

    return user