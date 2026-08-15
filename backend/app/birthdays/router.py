from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.birthdays.schemas import GiftDeliverRequest
from app.birthdays.service import BirthdayService
from app.shared.response import success_response

router = APIRouter(prefix="/birthdays", tags=["Birthdays & Gift Tracking System"])


@router.get("", response_model=dict)
async def get_birthdays(
    period: str = Query("today", description="الفترة الزمنية: today (اليوم), week (الـ 7 أيام القادمة), month (هذا الشهر)"),
    stage: Optional[str] = Query(None, description="المرحلة الدراسية"),
    gift_status: Optional[str] = Query(None, description="حالة الهدية: Delivered, Pending"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("birthdays:read"))
):
    service = BirthdayService(db)
    items = await service.get_birthdays(period=period, stage=stage, gift_status=gift_status)
    return success_response(
        data={"items": items, "total": len(items)},
        message="تم جلب قائمة أعياد الميلاد وحالات تسليم الهدايا بنجاح"
    )


@router.post("/deliver-gift", response_model=dict, status_code=status.HTTP_201_CREATED)
async def deliver_gift(
    deliver_in: GiftDeliverRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("birthdays:read"))
):
    service = BirthdayService(db)
    result = await service.deliver_gift(deliver_in, current_user.get("user_id"))
    return success_response(data=result, message="تم توثيق تسليم هدية عيد الميلاد بنجاح 🎁")


@router.get("/members/{member_id}/history", response_model=dict)
async def get_member_gift_history(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("birthdays:read"))
):
    service = BirthdayService(db)
    history = await service.get_member_gift_history(member_id)
    return success_response(data=history, message="تم جلب سجل تسليم الهدايا التاريخي بنجاح")
