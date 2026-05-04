# backend/schemas/auth.py
"""
Pydantic models define the shape of request/response data.

They:
- Validate incoming JSON
- Help FastAPI auto-generate docs
"""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    # EmailStr validates proper email format automatically
    email: EmailStr
    
    # Enforce minimum password length
    password: str = Field(min_length=8)


class AuthResponse(BaseModel):
    # This is what we return after register/login
    access_token: str
    token_type: str = "bearer"
    
    
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=512)
    new_password: str = Field(min_length=8, max_length=72)


class ResetPasswordResponse(BaseModel):
    message: str
