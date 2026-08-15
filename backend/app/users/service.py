from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.repository import UserRepository
from app.users.schemas import UserCreate, UserUpdate, UserPermissionsUpdate
from app.core.errors import AppException, NotFoundException, BadRequestException
from app.auth.dependencies import compute_effective_permissions
from fastapi import status


class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def create_user(self, user_data: UserCreate) -> dict:
        existing_user = await self.repo.get_by_username(user_data.username)
        if existing_user:
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="اسم المستخدم مستخدم بالفعل في النظام"
            )

        existing_email = await self.repo.get_by_email(str(user_data.email))
        if existing_email:
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="البريد الإلكتروني مستخدم بالفعل في النظام"
            )

        user = await self.repo.create_user(user_data)
        user["effective_permissions"] = list(compute_effective_permissions(user))
        return user

    async def list_users(self, page: int = 1, page_size: int = 50):
        skip = (page - 1) * page_size
        users = await self.repo.list_users(skip=skip, limit=page_size)
        total = await self.repo.count_users()
        for u in users:
            u["effective_permissions"] = list(compute_effective_permissions(u))
        return users, total

    async def get_user_by_id(self, user_id: str) -> dict:
        user = await self.repo.get_by_user_id(user_id)
        if not user:
            raise NotFoundException("المستخدم غير موجود")
        user["effective_permissions"] = list(compute_effective_permissions(user))
        return user

    async def update_user(self, user_id: str, update_data: UserUpdate) -> dict:
        user = await self.get_user_by_id(user_id)
        update_dict = update_data.model_dump(exclude_unset=True)

        if user.get("username") == "superadmin" or user.get("role") == "Super Admin":
            if "is_active" in update_dict and not update_dict["is_active"]:
                raise BadRequestException("حظر أمني: لا يمكن تعطيل حساب مسؤول النظام الأكبر (Super Admin)")
            if "role" in update_dict and update_dict["role"] != "Super Admin":
                raise BadRequestException("حظر أمني: لا يمكن خفض صلاحيات مسؤول النظام الأكبر")

        updated = await self.repo.update_user(user_id, update_data)
        updated["effective_permissions"] = list(compute_effective_permissions(updated))
        return updated

    async def update_permissions(self, user_id: str, data: UserPermissionsUpdate) -> dict:
        user = await self.get_user_by_id(user_id)
        if user.get("role") == "Super Admin":
            raise BadRequestException("السوبر أدمن معفي وتُفتح له كافة الصلاحيات تلقائياً")

        updated = await self.repo.update_permissions(user_id, data.custom_permissions, data.revoked_permissions)
        updated["effective_permissions"] = list(compute_effective_permissions(updated))
        return updated
