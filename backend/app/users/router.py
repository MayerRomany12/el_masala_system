import math
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.schemas import UserCreate, UserUpdate, UserResponse, UserPermissionsUpdate, RoleEnum
from app.users.service import UserService
from app.auth.dependencies import require_role, require_permission, get_current_user
from app.shared.schemas import StandardResponse, PaginatedResponse, PaginatedData
from app.core.database import get_db

router = APIRouter(prefix="/users", tags=["Users Management"])


@router.get("", response_model=dict)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("users:read"))
):
    service = UserService(db)
    users, total = await service.list_users(page=page, page_size=page_size)
    pages = math.ceil(total / page_size) if total > 0 else 1
    user_responses = [UserResponse(**u).model_dump() for u in users]
    return {
        "success": True,
        "message": "تم جلب قائمة المستخدمين بنجاح",
        "data": {
            "items": user_responses,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages
        }
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("users:write"))
):
    service = UserService(db)
    new_user = await service.create_user(body)
    return {
        "success": True,
        "message": "تم إنشاء حساب المستخدم بنجاح",
        "data": UserResponse(**new_user).model_dump()
    }


@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("users:read"))
):
    service = UserService(db)
    user = await service.get_user_by_id(user_id)
    return {
        "success": True,
        "message": "تم جلب بيانات المستخدم بنجاح",
        "data": UserResponse(**user).model_dump()
    }


@router.patch("/{user_id}", response_model=dict)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("users:write"))
):
    service = UserService(db)
    updated_user = await service.update_user(user_id, body)
    return {
        "success": True,
        "message": "تم تحديث بيانات المستخدم بنجاح",
        "data": UserResponse(**updated_user).model_dump()
    }


@router.patch("/{user_id}/permissions", response_model=dict)
async def update_user_permissions(
    user_id: str,
    body: UserPermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("users:permissions"))
):
    """
    تحديث الصلاحيات التفصيلية المخصصة (Granular Permissions) للمستخدم بواسطة السوبر أدمن
    """
    service = UserService(db)
    updated_user = await service.update_permissions(user_id, body)
    return {
        "success": True,
        "message": "تم تحديث الصلاحيات المخصصة للمستخدم بنجاح",
        "data": UserResponse(**updated_user).model_dump()
    }
