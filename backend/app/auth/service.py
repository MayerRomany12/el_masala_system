from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.users.repository import UserRepository
from app.core.security import verify_password, create_access_token
from app.core.errors import AppException
from app.core.database import get_db
from fastapi import status


class AuthService:
    def __init__(self, db: AsyncSession = None):
        self._db = db

    def _get_repo(self, db: AsyncSession) -> UserRepository:
        return UserRepository(db)

    async def authenticate_user(self, username: str, password: str, db: AsyncSession) -> dict:
        repo = self._get_repo(db)
        clean_username = username.strip()
        user = await repo.get_by_username(clean_username)
        if not user:
            user = await repo.get_by_email(clean_username)

        if not user or not verify_password(password, user["hashed_password"]):
            raise AppException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="اسم المستخدم أو كلمة المرور غير صحيحة"
            )

        if not user.get("is_active", True):
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="حساب المستخدم معطل حالياً، يرجى مراجعة المسؤول"
            )

        from app.auth.dependencies import compute_effective_permissions
        user["effective_permissions"] = list(compute_effective_permissions(user))

        await repo.update_last_login(user["user_id"])
        access_token = create_access_token({"sub": user["user_id"], "role": user["role"]})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
