from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.users.schemas import UserResponse

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AuthMeResponse(BaseModel):
    user: UserResponse
    permissions: List[str]
