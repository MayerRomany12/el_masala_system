from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.events.schemas import (
    EventCreate,
    EventUpdate,
    EventRegistrationCreate,
    EventRegistrationPaymentUpdate
)
from app.events.service import EventService
from app.shared.response import success_response

router = APIRouter(prefix="/events", tags=["Events, Sunday School Meetings & Trips"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_in: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("events:write"))
):
    service = EventService(db)
    new_event = await service.create_event(event_in)
    return success_response(
        data=new_event,
        message=f"تم إنشاء الفعالية/الرحلة بنجاح بالرمز {new_event['event_id']}"
    )


@router.get("", response_model=dict)
async def list_events(
    search: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("events:read"))
):
    service = EventService(db)
    result = await service.list_events(
        search=search, event_type=event_type, stage=stage, status=status, page=page, limit=limit
    )
    return success_response(data=result, message="تم جلب قائمة الفعاليات والرحلات بنجاح")


@router.get("/{event_id}", response_model=dict)
async def get_event_by_id(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("events:read"))
):
    service = EventService(db)
    event = await service.get_event_by_id(event_id)
    return success_response(data=event, message="تم جلب تفاصيل الفعالية")


@router.put("/{event_id}", response_model=dict)
async def update_event(
    event_id: str,
    update_in: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("events:write"))
):
    service = EventService(db)
    updated = await service.update_event(event_id, update_in)
    return success_response(data=updated, message="تم تحديث بيانات الفعالية بنجاح")


@router.patch("/{event_id}/status", response_model=dict)
async def update_event_status(
    event_id: str,
    status_str: str = Query(..., alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("events:write"))
):
    service = EventService(db)
    updated = await service.update_event_status(event_id, status_str)
    return success_response(data=updated, message=f"تم تغيير حالة الفعالية إلى {status_str}")


# ─── Participant Registrations & Payment Operations ────────────────────────────

@router.post("/{event_id}/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_member_to_event(
    event_id: str,
    reg_in: EventRegistrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("events:write"))
):
    service = EventService(db)
    reg = await service.register_member(event_id, reg_in)
    return success_response(
        data=reg,
        message=f"تم تسجيل المخدوم في الفعالية بنجاح (رمز التسجيل {reg['registration_id']})"
    )


@router.get("/{event_id}/participants", response_model=dict)
async def get_event_participants(
    event_id: str,
    payment_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("events:read"))
):
    service = EventService(db)
    participants = await service.get_event_participants(
        event_id=event_id, payment_status=payment_status, search=search
    )
    return success_response(data=participants, message="تم جلب كشف المشتركين والاشتراكات بنجاح")


@router.patch("/{event_id}/participants/{registration_id}/payment", response_model=dict)
async def update_participant_payment(
    event_id: str,
    registration_id: str,
    payment_in: EventRegistrationPaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("events:write"))
):
    service = EventService(db)
    updated = await service.update_registration_payment(
        event_id=event_id, registration_id=registration_id, data=payment_in
    )
    return success_response(data=updated, message="تم تحديث السداد والاشتراك المالي بنجاح")
