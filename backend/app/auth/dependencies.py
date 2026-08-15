from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Set

from app.core.security import decode_access_token
from app.core.database import get_db
from app.core.permissions import ALL_PERMISSIONS, is_valid_permission
from app.users.schemas import RoleEnum

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

ROLE_PERMISSIONS = {
    RoleEnum.SUPER_ADMIN: list(ALL_PERMISSIONS),
    RoleEnum.ADMIN: [
        "users:read",
        "members:read", "members:write", "members:archive",
        "cards:issue", "cards:revoke",
        "events:read", "events:write",
        "attendance:session", "attendance:scan", "attendance:cancel",
        "devices:manage",
        "followup:read", "followup:write", "followup:manage",
        "rewards:read", "rewards:manage", "discounts:manage",
        "birthdays:read", "birthdays:gift",
        "reports:read", "reports:export", "audit:read",
        "messages:send", "messages:manage"
    ],
    RoleEnum.SERVANT: [
        "members:read",
        "events:read",
        "attendance:session", "attendance:scan",
        "followup:read", "followup:write",
        "rewards:read",
        "birthdays:read", "birthdays:gift",
        "messages:send"
    ]
}


def compute_effective_permissions(user: dict) -> Set[str]:
    """
    Effective Permissions = (Role Permissions + custom_permissions) - revoked_permissions
    SuperAdmin receives ALL_PERMISSIONS automatically.
    """
    role = user.get("role", RoleEnum.SERVANT)
    if role == RoleEnum.SUPER_ADMIN or role == "Super Admin":
        return ALL_PERMISSIONS.copy()

    base_perms = set(ROLE_PERMISSIONS.get(role, []))
    custom_perms = set(user.get("custom_permissions") or [])
    revoked_perms = set(user.get("revoked_permissions") or [])

    # Filter out invalid permission strings
    custom_perms = {p for p in custom_perms if is_valid_permission(p)}
    revoked_perms = {p for p in revoked_perms if is_valid_permission(p)}

    effective = (base_perms | custom_perms) - revoked_perms
    return effective


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="تعذر التحقق من اعتمادات الدخول",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        if payload is None:
            raise credentials_exception

        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        from app.users.repository import UserRepository
        repo = UserRepository(db)
        user = await repo.get_by_user_id(user_id)
        if user is None or not user.get("is_active", True):
            raise credentials_exception

        # Compute effective permissions on user dictionary
        user["effective_permissions"] = list(compute_effective_permissions(user))
        return user
    except HTTPException:
        raise
    except Exception as err:
        from app.core.logging import logger
        logger.error(f"Error in get_current_user: {err}")
        raise credentials_exception


def require_permission(required_permission: str):
    """Dependency guard verifying required_permission is in compute_effective_permissions."""
    async def permission_checker(
        current_user: dict = Depends(get_current_user)
    ):
        role = current_user.get("role", RoleEnum.SERVANT)
        if role == RoleEnum.SUPER_ADMIN or role == "Super Admin":
            return current_user

        effective_perms = set(current_user.get("effective_permissions") or [])
        if required_permission not in effective_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"ليس لديك الصلاحية الكافية ({required_permission}) لإتمام هذه العملية"
            )
        return current_user
    return permission_checker


def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        role = current_user.get("role")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="المستخدم الحالي لا يملك الصلاحية المطلوبة"
            )
        return current_user
    return role_checker
