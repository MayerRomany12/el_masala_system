from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class RoleEnum:
    SUPER_ADMIN = "Super Admin"
    ADMIN = "Admin"
    SERVANT = "Servant"


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str
    role: str = RoleEnum.SERVANT
    assigned_stages: Optional[List[str]] = Field(default_factory=list)
    assigned_groups: Optional[List[str]] = Field(default_factory=list)
    custom_permissions: Optional[List[str]] = Field(default_factory=list)
    revoked_permissions: Optional[List[str]] = Field(default_factory=list)
    is_active: bool = True

    model_config = {"extra": "ignore"}


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    assigned_stages: Optional[List[str]] = None
    assigned_groups: Optional[List[str]] = None
    custom_permissions: Optional[List[str]] = None
    revoked_permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserPermissionsUpdate(BaseModel):
    custom_permissions: Optional[List[str]] = Field(default_factory=list)
    revoked_permissions: Optional[List[str]] = Field(default_factory=list)


class UserResponse(UserBase):
    user_id: str
    effective_permissions: Optional[List[str]] = Field(default_factory=list)
    created_at: datetime
    last_login: Optional[datetime] = None
