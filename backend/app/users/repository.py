from typing import Optional, List
from datetime import datetime, timezone
import uuid

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.users.schemas import UserCreate, UserUpdate
from app.core.security import get_password_hash


def _row_to_dict(row: User) -> dict:
    return {
        "user_id": row.user_id,
        "username": row.username,
        "email": row.email,
        "full_name": row.full_name,
        "hashed_password": row.hashed_password,
        "role": row.role,
        "assigned_stages": list(row.assigned_stages or []),
        "assigned_groups": list(row.assigned_groups or []),
        "custom_permissions": list(row.custom_permissions or []),
        "revoked_permissions": list(row.revoked_permissions or []),
        "is_active": row.is_active,
        "created_at": row.created_at,
        "last_login": row.last_login,
    }


class UserRepository:
    def __init__(self, db: AsyncSession = None):
        self._db = db

    def _get_db(self) -> AsyncSession:
        if self._db is None:
            raise RuntimeError("No database session provided to UserRepository")
        return self._db

    async def get_by_username(self, username: str) -> Optional[dict]:
        clean_name = username.strip().lower()
        result = await self._get_db().execute(
            select(User).where(func.lower(User.username) == clean_name)
        )
        row = result.scalar_one_or_none()
        return _row_to_dict(row) if row else None

    async def get_by_user_id(self, user_id: str) -> Optional[dict]:
        result = await self._get_db().execute(
            select(User).where(User.user_id == user_id)
        )
        row = result.scalar_one_or_none()
        return _row_to_dict(row) if row else None

    async def get_by_email(self, email: str) -> Optional[dict]:
        clean_email = email.strip().lower()
        result = await self._get_db().execute(
            select(User).where(func.lower(User.email) == clean_email)
        )
        row = result.scalar_one_or_none()
        return _row_to_dict(row) if row else None

    async def create_user(self, user_data: UserCreate) -> dict:
        user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
        new_user = User(
            user_id=user_id,
            username=user_data.username,
            email=str(user_data.email),
            full_name=user_data.full_name,
            hashed_password=get_password_hash(user_data.password),
            role=user_data.role,
            assigned_stages=user_data.assigned_stages or [],
            assigned_groups=user_data.assigned_groups or [],
            custom_permissions=user_data.custom_permissions or [],
            revoked_permissions=user_data.revoked_permissions or [],
            is_active=user_data.is_active,
        )
        self._get_db().add(new_user)
        await self._get_db().flush()
        await self._get_db().refresh(new_user)
        return _row_to_dict(new_user)

    async def list_users(self, skip: int = 0, limit: int = 50) -> List[dict]:
        result = await self._get_db().execute(
            select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
        )
        rows = result.scalars().all()
        return [_row_to_dict(r) for r in rows]

    async def count_users(self) -> int:
        result = await self._get_db().execute(
            select(func.count()).select_from(User)
        )
        return result.scalar_one()

    async def update_user(self, user_id: str, update_data: UserUpdate) -> Optional[dict]:
        fields = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
        if "password" in fields:
            fields["hashed_password"] = get_password_hash(fields.pop("password"))
        if not fields:
            return await self.get_by_user_id(user_id)

        await self._get_db().execute(
            update(User).where(User.user_id == user_id).values(**fields)
        )
        await self._get_db().flush()
        return await self.get_by_user_id(user_id)

    async def update_permissions(self, user_id: str, custom_perms: List[str], revoked_perms: List[str]) -> Optional[dict]:
        await self._get_db().execute(
            update(User)
            .where(User.user_id == user_id)
            .values(custom_permissions=custom_perms, revoked_permissions=revoked_perms)
        )
        await self._get_db().flush()
        return await self.get_by_user_id(user_id)

    async def update_last_login(self, user_id: str):
        await self._get_db().execute(
            update(User)
            .where(User.user_id == user_id)
            .values(last_login=datetime.now(timezone.utc))
        )
        await self._get_db().flush()
