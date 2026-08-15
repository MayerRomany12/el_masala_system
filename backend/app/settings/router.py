from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.settings.schemas import SystemSettingsUpdateSchema
from app.settings.service import SettingsService
from app.shared.response import success_response

router = APIRouter(prefix="/settings", tags=["System Settings & Dynamic Configuration"])


@router.get("", response_model=dict)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = SettingsService(db)
    settings = await service.get_settings()
    return success_response(data=settings, message="تم جلب إعدادات النظام الديناميكية بنجاح")


@router.put("", response_model=dict)
async def update_settings(
    settings_in: SystemSettingsUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("settings:write"))
):
    """تعديل وتحديث إعدادات وثوابت النظام الديناميكية بواسطة المسؤول"""
    service = SettingsService(db)
    updated = await service.update_settings(settings_in.settings)
    return success_response(data=updated, message="تم حفظ وتعديل إعدادات للنظام بنجاح ⚙️")
