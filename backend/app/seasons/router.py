from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.seasons.schemas import SeasonCreate, SeasonUpdate
from app.seasons.service import SeasonService
from app.shared.response import success_response

router = APIRouter(prefix="/seasons", tags=["Seasons Management"])


@router.get("", response_model=dict)
async def list_seasons(
    active_only: Optional[bool] = Query(None, description="عرض المواسم النشطة فقط"),
    status: Optional[str] = Query(None, description="تصفية بالحالة (Active)"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = SeasonService(db)
    is_active_filter = bool(active_only or (status and status.lower() == "active"))
    items = await service.list_seasons(active_only=is_active_filter)
    return success_response(data={"items": items, "total": len(items)}, message="تم جلب قائمة المواسم الخدمية بنجاح")


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_season(
    data: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = SeasonService(db)
    season = await service.create_season(data)
    return success_response(data=season, message="تم إنشاء الموسم الخدمي بنجاح")


@router.get("/{season_id}", response_model=dict)
async def get_season(
    season_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = SeasonService(db)
    season = await service.get_season(season_id)
    return success_response(data=season, message="تم جلب تفاصيل الموسم بنجاح")


@router.put("/{season_id}", response_model=dict)
async def update_season(
    season_id: str,
    data: SeasonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = SeasonService(db)
    season = await service.update_season(season_id, data)
    return success_response(data=season, message="تم تحديث بيانات الموسم بنجاح")
