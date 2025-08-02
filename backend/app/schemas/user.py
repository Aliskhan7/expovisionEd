"""
User Pydantic schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    name: str
    role: str = "student"


class UserCreate(UserBase):
    """User creation schema"""
    password: str


class UserUpdate(BaseModel):
    """User update schema"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(UserBase):
    """User response schema"""
    id: int
    is_active: bool
    subscription_status: str
    subscription_expiry: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token data schema"""
    user_id: Optional[int] = None

