import secrets
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, date, timezone

from sqlalchemy import select, update, func, or_, String, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.event import Event, EventRegistration
from app.models.member import Member
from app.core.errors import AppException


def _parse_date(d: Any) -> date:
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        return datetime.strptime(d.strip(), "%Y-%m-%d").date()
    raise ValueError(f"Invalid date format: {d}")


def _compute_payment_status(amount_paid: float, amount_due: float) -> str:
    if amount_due <= 0:
        return "Paid"
    if amount_paid <= 0:
        return "Unpaid"
    if amount_paid >= amount_due:
        return "Paid"
    return "Partial"


def _event_to_dict(row: Event, participants_count: int = 0, total_collected: float = 0.0, total_due: float = 0.0) -> Dict[str, Any]:
    collected = float(total_collected or 0.0)
    due = float(total_due or 0.0)
    remaining = max(0.0, due - collected)
    return {
        "event_id": row.event_id,
        "title": row.title,
        "event_type": row.event_type,
        "event_date": row.event_date.isoformat() if isinstance(row.event_date, (date, datetime)) else str(row.event_date),
        "stage": row.stage,
        "fee": float(row.fee or 0.0),
        "is_free": getattr(row, "is_free", False) or False,
        "recurrence": getattr(row, "recurrence", "OneTime") or "OneTime",
        "location": row.location,
        "description": row.description,
        "status": row.status,
        "participants_count": participants_count,
        "total_collected": collected,
        "total_due": due,
        "total_remaining": remaining,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _registration_to_dict(reg: EventRegistration, member: Optional[Member] = None) -> Dict[str, Any]:
    due = float(reg.amount_due or 0.0)
    paid = float(reg.amount_paid or 0.0)
    remaining = max(0.0, due - paid)
    return {
        "registration_id": reg.registration_id,
        "event_id": reg.event_id,
        "member_id": reg.member_id,
        "member_name": member.full_name if member else None,
        "member_stage": member.stage if member else None,
        "member_phone": member.phone if member else None,
        "attendance_discount_amount": float(reg.attendance_discount_amount or 0.0),
        "points_discount_amount": float(reg.points_discount_amount or 0.0),
        "amount_due": due,
        "amount_paid": paid,
        "remaining_amount": remaining,
        "payment_status": reg.payment_status,
        "notes": reg.notes,
        "created_at": reg.created_at,
        "updated_at": reg.updated_at,
    }


class EventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """توليد EVT-XXXXXX عشوائياً بأمان"""
        max_retries = 10
        raw_date = event_data.pop("event_date")
        parsed_date = _parse_date(raw_date)

        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"EVT-{rand_num:06d}"

            new_event = Event(
                event_id=candidate_id,
                event_date=parsed_date,
                **event_data
            )
            self.db.add(new_event)
            try:
                await self.db.flush()
                await self.db.refresh(new_event)
                return _event_to_dict(new_event)
            except IntegrityError:
                await self.db.rollback()
                continue

        raise AppException(message="تعذر توليد رمز فعالية فريد، يرجى إعادة المحاولة")

    async def get_event_by_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        result = await self.db.execute(select(Event).where(Event.event_id == event_id))
        event_row = result.scalar_one_or_none()
        if not event_row:
            return None

        # Stats query for this event
        stats_q = select(
            func.count(EventRegistration.registration_id),
            func.coalesce(func.sum(EventRegistration.amount_paid), 0.0),
            func.coalesce(func.sum(EventRegistration.amount_due), 0.0)
        ).where(EventRegistration.event_id == event_id)

        stats_res = await self.db.execute(stats_q)
        count, collected, due = stats_res.one()

        return _event_to_dict(event_row, count, float(collected), float(due))

    async def get_events(
        self,
        search: Optional[str] = None,
        event_type: Optional[str] = None,
        stage: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = select(Event)

        if status:
            query = query.where(Event.status == status)
        if event_type:
            query = query.where(Event.event_type == event_type)
        if stage and stage != "ALL":
            query = query.where(or_(Event.stage == stage, Event.stage == "ALL"))
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Event.title.ilike(pattern),
                    Event.location.ilike(pattern),
                    Event.event_id.ilike(pattern),
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        query = query.order_by(Event.event_date.desc(), Event.created_at.desc()).offset(skip).limit(limit)
        events_res = await self.db.execute(query)
        event_rows = events_res.scalars().all()

        items = []
        for e in event_rows:
            stats_q = select(
                func.count(EventRegistration.registration_id),
                func.coalesce(func.sum(EventRegistration.amount_paid), 0.0),
                func.coalesce(func.sum(EventRegistration.amount_due), 0.0)
            ).where(EventRegistration.event_id == e.event_id)
            c, col, d = (await self.db.execute(stats_q)).one()
            items.append(_event_to_dict(e, c, float(col), float(d)))

        return items, total

    async def update_event(self, event_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if "event_date" in update_data and update_data["event_date"]:
            update_data["event_date"] = _parse_date(update_data["event_date"])

        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(Event).where(Event.event_id == event_id).values(**update_data)
        )
        await self.db.flush()
        return await self.get_event_by_id(event_id)

    # ─── Registrations & Payments ─────────────────────────────────────────────

    async def get_registration_by_event_and_member(self, event_id: str, member_id: str) -> Optional[Dict[str, Any]]:
        query = select(EventRegistration, Member).join(Member, EventRegistration.member_id == Member.member_id).where(
            EventRegistration.event_id == event_id,
            EventRegistration.member_id == member_id
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            return None
        reg, mem = row
        return _registration_to_dict(reg, mem)

    async def create_registration(self, reg_data: Dict[str, Any]) -> Dict[str, Any]:
        """توليد REG-XXXXXX عشوائياً وتحديد حالة الدفع آلياً"""
        max_retries = 10
        due = float(reg_data.get("amount_due", 0.0))
        paid = float(reg_data.get("amount_paid", 0.0))
        status = _compute_payment_status(paid, due)
        reg_data["payment_status"] = status

        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"REG-{rand_num:06d}"

            new_reg = EventRegistration(
                registration_id=candidate_id,
                **reg_data
            )
            self.db.add(new_reg)
            try:
                await self.db.flush()
                await self.db.refresh(new_reg)
                # Fetch with member details
                return await self.get_registration_by_id(candidate_id)
            except IntegrityError:
                await self.db.rollback()
                continue

        raise AppException(message="تعذر توليد رمز تسجيل فريد، يرجى إعادة المحاولة")

    async def get_registration_by_id(self, registration_id: str) -> Optional[Dict[str, Any]]:
        query = select(EventRegistration, Member).join(Member, EventRegistration.member_id == Member.member_id).where(
            EventRegistration.registration_id == registration_id
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            return None
        reg, mem = row
        return _registration_to_dict(reg, mem)

    async def get_event_participants(
        self,
        event_id: str,
        payment_status: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = select(EventRegistration, Member).join(Member, EventRegistration.member_id == Member.member_id).where(
            EventRegistration.event_id == event_id
        )

        if payment_status:
            query = query.where(EventRegistration.payment_status == payment_status)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Member.full_name.ilike(pattern),
                    Member.phone.ilike(pattern),
                    Member.member_id.ilike(pattern),
                )
            )

        query = query.order_by(EventRegistration.created_at.desc())
        res = await self.db.execute(query)
        rows = res.all()

        return [_registration_to_dict(reg, mem) for reg, mem in rows]

    async def update_registration_payment(self, registration_id: str, amount_paid: float, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        res = await self.db.execute(select(EventRegistration).where(EventRegistration.registration_id == registration_id))
        reg = res.scalar_one_or_none()
        if not reg:
            return None

        due = float(reg.amount_due or 0.0)
        new_status = _compute_payment_status(amount_paid, due)

        update_values = {
            "amount_paid": amount_paid,
            "payment_status": new_status,
            "updated_at": datetime.now(timezone.utc)
        }
        if notes is not None:
            update_values["notes"] = notes

        await self.db.execute(
            update(EventRegistration)
            .where(EventRegistration.registration_id == registration_id)
            .values(**update_values)
        )
        await self.db.flush()
        return await self.get_registration_by_id(registration_id)
