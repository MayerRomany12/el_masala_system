from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, TokenResponse, AuthMeResponse
from app.auth.service import AuthService
from app.auth.dependencies import get_current_user
from app.users.schemas import UserResponse
from app.shared.schemas import StandardResponse
from app.core.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=StandardResponse[TokenResponse])
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService()
    result = await service.authenticate_user(body.username, body.password, db)
    return StandardResponse(
        success=True,
        message="تم تسجيل الدخول بنجاح",
        data=TokenResponse(
            access_token=result["access_token"],
            token_type=result["token_type"],
            user=UserResponse(**result["user"])
        )
    )


@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """OAuth2 compatible token login handler (Swagger UI support)"""
    service = AuthService()
    result = await service.authenticate_user(form_data.username, form_data.password, db)
    return TokenResponse(
        access_token=result["access_token"],
        token_type=result["token_type"],
        user=UserResponse(**result["user"])
    )


@router.get("/me", response_model=StandardResponse[AuthMeResponse])
async def get_me(current_user: dict = Depends(get_current_user)):
    user_response = UserResponse(**current_user)
    permissions = current_user.get("effective_permissions", [])
    return StandardResponse(
        success=True,
        message="تم جلب بيانات المستخدم الحالية",
        data=AuthMeResponse(
            user=user_response,
            permissions=permissions
        )
    )
