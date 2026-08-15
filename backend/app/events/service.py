from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.repository import EventRepository
from app.members.repository import MemberRepository
from app.events.schemas import (
    EventCreate,
    EventUpdate,
    EventRegistrationCreate,
    EventRegistrationPaymentUpdate,
    EventStatusEnum
)
from app.core.errors import NotFoundException, BadRequestException


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.event_repo = EventRepository(db)
        self.member_repo = MemberRepository(db)

    async def create_event(self, data: EventCreate) -> Dict[str, Any]:
        event_dict = data.model_dump()
        return await self.event_repo.create_event(event_dict)

    async def get_event_by_id(self, event_id: str) -> Dict[str, Any]:
        event = await self.event_repo.get_event_by_id(event_id)
        if not event:
            raise NotFoundException(f"الفعالية/الرحلة برقم {event_id} غير موجودة")
        return event

    async def list_events(
        self,
        search: Optional[str] = None,
        event_type: Optional[str] = None,
        stage: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        page = max(1, page)
        limit = min(100, max(1, limit))
        skip = (page - 1) * limit

        items, total = await self.event_repo.get_events(
            search=search, event_type=event_type, stage=stage, status=status, skip=skip, limit=limit
        )
        return {"total": total, "page": page, "limit": limit, "items": items}

    async def update_event(self, event_id: str, data: EventUpdate) -> Dict[str, Any]:
        existing = await self.event_repo.get_event_by_id(event_id)
        if not existing:
            raise NotFoundException(f"الفعالية برقم {event_id} غير موجودة")

        update_fields = data.model_dump(exclude_unset=True)
        if not update_fields:
            return existing

        updated = await self.event_repo.update_event(event_id, update_fields)
        return updated

    async def update_event_status(self, event_id: str, new_status: str) -> Dict[str, Any]:
        valid_statuses = [EventStatusEnum.ACTIVE, EventStatusEnum.COMPLETED, EventStatusEnum.CANCELLED]
        if new_status not in valid_statuses:
            raise BadRequestException(f"الحالة غير صالحة. الحالات المسموحة: {', '.join(valid_statuses)}")

        existing = await self.event_repo.get_event_by_id(event_id)
        if not existing:
            raise NotFoundException(f"الفعالية برقم {event_id} غير موجودة")

        return await self.event_repo.update_event(event_id, {"status": new_status})

    # ─── Event Registrations & Payments ───────────────────────────────────────

    async def register_member(self, event_id: str, data: EventRegistrationCreate) -> Dict[str, Any]:
        # 1. Check if event exists and is Active
        event = await self.event_repo.get_event_by_id(event_id)
        if not event:
            raise NotFoundException(f"الفعالية/الرحلة برقم {event_id} غير موجودة")

        if event["status"] != EventStatusEnum.ACTIVE:
            raise BadRequestException(f"لا يمكن التسجيل في فعالية غير نشطة (حالة الفعالية الحالية: {event['status']})")

        # 2. Check if member exists and is Active
        member = await self.member_repo.get_by_member_id(data.member_id)
        if not member:
            raise NotFoundException(f"المخدوم برقم العضوية {data.member_id} غير موجود")

        if member["status"] != "Active":
            raise BadRequestException(f"يمكن فقط تسجيل الأطفال النشطين في الأنشطة والرحلات (حالة الطفل الحالية: {member['status']})")

        # 3. Check if member is already registered in this event
        existing_reg = await self.event_repo.get_registration_by_event_and_member(event_id, data.member_id)
        if existing_reg:
            raise BadRequestException(f"المخدوم ({member['full_name']}) مسجل بالفعل في هذه الفعالية برقم {existing_reg['registration_id']}")

        # 4. Resolve amount_due (default to event fee if not passed)
        amount_due = data.amount_due if data.amount_due is not None else float(event["fee"])
        amount_paid = float(data.amount_paid or 0.0)

        # 5. Check payment bounds
        if amount_paid > amount_due:
            raise BadRequestException(f"المبلغ المدفوع ({amount_paid} جم) يتجاوز المبلغ المستحق المطلـوب ({amount_due} جم)")

        reg_data = {
            "event_id": event_id,
            "member_id": data.member_id,
            "amount_due": amount_due,
            "amount_paid": amount_paid,
            "notes": data.notes
        }

        return await self.event_repo.create_registration(reg_data)

    async def get_event_participants(
        self,
        event_id: str,
        payment_status: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        event = await self.event_repo.get_event_by_id(event_id)
        if not event:
            raise NotFoundException(f"الفعالية/الرحلة برقم {event_id} غير موجودة")

        return await self.event_repo.get_event_participants(
            event_id=event_id, payment_status=payment_status, search=search
        )

    async def update_registration_payment(
        self,
        event_id: str,
        registration_id: str,
        data: EventRegistrationPaymentUpdate
    ) -> Dict[str, Any]:
        reg = await self.event_repo.get_registration_by_id(registration_id)
        if not reg or reg["event_id"] != event_id:
            raise NotFoundException(f"سجل الاشتراك {registration_id} غير موجود بهذه الفعالية")

        amount_due = float(reg["amount_due"])
        amount_paid = float(data.amount_paid)

        if amount_paid > amount_due:
            raise BadRequestException(f"المبلغ المدفوع ({amount_paid} جم) يتجاوز المبلغ المستحق المطلـوب ({amount_due} جم)")

        updated = await self.event_repo.update_registration_payment(
            registration_id=registration_id,
            amount_paid=amount_paid,
            notes=data.notes
        )
        return updated
