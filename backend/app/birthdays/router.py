from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission, get_servant_class_ids
from app.birthdays.schemas import GiftDeliverRequest
from app.birthdays.service import BirthdayService
from app.shared.response import success_response

router = APIRouter(prefix="/birthdays", tags=["Birthdays & Gift Tracking System"])


@router.get("", response_model=dict)
async def get_birthdays(
    period: str = Query("today", description="الفترة الزمنية: today (اليوم), week (الـ 7 أيام القادمة), month (هذا الشهر)"),
    stage: Optional[str] = Query(None, description="المرحلة الدراسية"),
    class_id: Optional[str] = Query(None, description="تصفية بحسب الفصل الخدمي"),
    gift_status: Optional[str] = Query(None, description="حالة الهدية: Delivered, Pending"),
    month: Optional[int] = Query(None, ge=1, le=12, description="شهر الميلاد (1 إلى 12)"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("birthdays:read"))
):
    allowed_class_ids = await get_servant_class_ids(current_user, db)
    if class_id and allowed_class_ids is not None and class_id not in allowed_class_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لعرض أعياد ميلاد هذا الفصل")

    service = BirthdayService(db)
    items = await service.get_birthdays(
        period=period, stage=stage, class_id=class_id,
        allowed_class_ids=allowed_class_ids, gift_status=gift_status, month=month
    )
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
