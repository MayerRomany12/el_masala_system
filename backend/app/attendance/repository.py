import secrets
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, date, timezone

from sqlalchemy import select, update, delete, func, or_, String, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.attendance import (
    AuthorizedDevice,
    AttendanceSession,
    AttendanceSessionServant,
    AttendanceRecord
)
from app.models.member import Member
from app.models.user import User
from app.core.errors import AppException


def _parse_date(d: Any) -> date:
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        return datetime.strptime(d.strip(), "%Y-%m-%d").date()
    raise ValueError(f"Invalid date format: {d}")


class AttendanceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Devices ──────────────────────────────────────────────────────────────

    async def create_device(self, device_name: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"DEV-{rand_num:06d}"
            device_token = secrets.token_hex(32)

            device = AuthorizedDevice(
                device_id=candidate_id,
                device_name=device_name,
                device_token=device_token,
                registered_by=user_id,
                is_active=True
            )
            self.db.add(device)
            try:
                await self.db.flush()
                await self.db.refresh(device)
                return {
                    "device_id": device.device_id,
                    "device_name": device.device_name,
                    "device_token": device.device_token,
                    "is_active": device.is_active,
                    "last_used_at": device.last_used_at,
                    "created_at": device.created_at
                }
            except IntegrityError:
                await self.db.rollback()
                continue
        raise AppException(message="تعذر تسجيل جهاز معتمد جديد")

    async def get_device_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        if not token:
            return None
        res = await self.db.execute(
            select(AuthorizedDevice).where(
                AuthorizedDevice.device_token == token,
                AuthorizedDevice.is_active == True
            )
        )
        row = res.scalar_one_or_none()
        if not row:
            return None
        return {
            "device_id": row.device_id,
            "device_name": row.device_name,
            "device_token": row.device_token,
            "is_active": row.is_active,
            "last_used_at": row.last_used_at,
            "created_at": row.created_at
        }

    async def update_device_last_used(self, device_id: str):
        await self.db.execute(
            update(AuthorizedDevice)
            .where(AuthorizedDevice.device_id == device_id)
            .values(last_used_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def list_devices(self) -> List[Dict[str, Any]]:
        res = await self.db.execute(select(AuthorizedDevice).order_by(AuthorizedDevice.created_at.desc()))
        rows = res.scalars().all()
        return [{
            "device_id": d.device_id,
            "device_name": d.device_name,
            "device_token": d.device_token,
            "is_active": d.is_active,
            "last_used_at": d.last_used_at,
            "created_at": d.created_at
        } for d in rows]

    # ─── Sessions ─────────────────────────────────────────────────────────────

    async def create_session(self, session_data: Dict[str, Any], authorized_user_ids: List[str] = []) -> Dict[str, Any]:
        max_retries = 10
        raw_date = session_data.pop("session_date")
        parsed_date = _parse_date(raw_date)

        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"SES-{rand_num:06d}"

            session = AttendanceSession(
                session_id=candidate_id,
                session_date=parsed_date,
                **session_data
            )
            self.db.add(session)
            try:
                await self.db.flush()
                await self.db.refresh(session)

                # Add authorized servants
                if authorized_user_ids:
                    for uid in set(authorized_user_ids):
                        self.db.add(AttendanceSessionServant(session_id=candidate_id, user_id=uid))
                    await self.db.flush()

                return await self.get_session_by_id(candidate_id)
            except IntegrityError:
                await self.db.rollback()
                continue

        raise AppException(message="تعذر إنشاء جلسة حضور جديدة")

    async def get_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        res = await self.db.execute(select(AttendanceSession).where(AttendanceSession.session_id == session_id))
        s_row = res.scalar_one_or_none()
        if not s_row:
            return None

        # Fetch session servants
        serv_res = await self.db.execute(
            select(AttendanceSessionServant.user_id).where(AttendanceSessionServant.session_id == session_id)
        )
        servant_ids = list(serv_res.scalars().all())

        # Present count (Valid records)
        present_q = select(func.count(AttendanceRecord.record_id)).where(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.status == "Valid"
        )
        present_count = (await self.db.execute(present_q)).scalar_one()

        # Targeted active members count for stage
        target_q = select(func.count(Member.member_id)).where(Member.status == "Active")
        if s_row.stage and s_row.stage != "ALL":
            target_q = target_q.where(Member.stage.ilike(f"%{s_row.stage.split('-')[0].strip()}%"))

        targeted_count = (await self.db.execute(target_q)).scalar_one()
        pct = round((present_count / targeted_count * 100), 1) if targeted_count > 0 else 0.0

        return {
            "session_id": s_row.session_id,
            "event_id": s_row.event_id,
            "session_date": s_row.session_date.isoformat() if isinstance(s_row.session_date, (date, datetime)) else str(s_row.session_date),
            "title": s_row.title,
            "stage": s_row.stage,
            "recurrence": getattr(s_row, "recurrence", "Weekly") or "Weekly",
            "status": s_row.status,
            "created_by": s_row.created_by,
            "authorized_user_ids": servant_ids,
            "present_count": present_count,
            "targeted_count": targeted_count,
            "attendance_percentage": pct,
            "created_at": s_row.created_at,
            "updated_at": s_row.updated_at
        }

    async def update_session_recurrence(self, session_id: str, new_recurrence: str) -> Optional[Dict[str, Any]]:
        await self.db.execute(
            update(AttendanceSession)
            .where(AttendanceSession.session_id == session_id)
            .values(recurrence=new_recurrence, updated_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
        return await self.get_session_by_id(session_id)

    async def get_sessions(
        self,
        search: Optional[str] = None,
        stage: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = select(AttendanceSession)

        if status:
            query = query.where(AttendanceSession.status == status)
        if stage and stage != "ALL":
            query = query.where(or_(AttendanceSession.stage == stage, AttendanceSession.stage == "ALL"))
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    AttendanceSession.title.ilike(pattern),
                    AttendanceSession.session_id.ilike(pattern),
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        query = query.order_by(AttendanceSession.session_date.desc(), AttendanceSession.created_at.desc()).offset(skip).limit(limit)
        session_rows = (await self.db.execute(query)).scalars().all()

        items = []
        for s in session_rows:
            full_s = await self.get_session_by_id(s.session_id)
            if full_s:
                items.append(full_s)

        return items, total

    async def update_session_status(self, session_id: str, new_status: str) -> Optional[Dict[str, Any]]:
        await self.db.execute(
            update(AttendanceSession)
            .where(AttendanceSession.session_id == session_id)
            .values(status=new_status, updated_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
        return await self.get_session_by_id(session_id)

    async def is_user_authorized_for_session(self, session_id: str, user_id: str, user_role: str) -> bool:
        if user_role in ["Super Admin", "Admin"]:
            return True
        res = await self.db.execute(
            select(AttendanceSessionServant).where(
                AttendanceSessionServant.session_id == session_id,
                AttendanceSessionServant.user_id == user_id
            )
        )
        return res.scalar_one_or_none() is not None

    # ─── Attendance Records & Unified Scan Motor ──────────────────────────────

    async def get_record_by_session_and_member(self, session_id: str, member_id: str) -> Optional[Dict[str, Any]]:
        query = select(AttendanceRecord).where(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.member_id == member_id
        )
        res = await self.db.execute(query)
        row = res.scalar_one_or_none()
        if not row:
            return None
        return await self.get_record_by_id(row.record_id)

    async def get_record_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        query = (
            select(
                AttendanceRecord,
                Member,
                User.full_name.label("scanned_by_name"),
                AuthorizedDevice.device_name.label("scanned_device_name")
            )
            .join(Member, AttendanceRecord.member_id == Member.member_id)
            .outerjoin(User, AttendanceRecord.scanned_by_user == User.user_id)
            .outerjoin(AuthorizedDevice, AttendanceRecord.scanned_device_id == AuthorizedDevice.device_id)
            .where(AttendanceRecord.record_id == record_id)
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            return None

        reg, mem, scan_user, dev_name = row
        cancelled_by_name = None
        if reg.cancelled_by:
            c_res = await self.db.execute(select(User.full_name).where(User.user_id == reg.cancelled_by))
            cancelled_by_name = c_res.scalar_one_or_none()

        return {
            "record_id": reg.record_id,
            "session_id": reg.session_id,
            "member_id": reg.member_id,
            "member_name": mem.full_name,
            "member_stage": mem.stage,
            "scanned_by_user": reg.scanned_by_user,
            "scanned_by_name": scan_user,
            "scanned_device_name": dev_name,
            "method": reg.method,
            "status": reg.status,
            "cancelled_by_name": cancelled_by_name,
            "cancelled_at": reg.cancelled_at,
            "cancellation_reason": reg.cancellation_reason,
            "scanned_at": reg.scanned_at,
        }

    async def create_record(
        self,
        session_id: str,
        member_id: str,
        user_id: Optional[str] = None,
        device_id: Optional[str] = None,
        method: str = "QR"
    ) -> Dict[str, Any]:
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"ATT-{rand_num:06d}"

            record = AttendanceRecord(
                record_id=candidate_id,
                session_id=session_id,
                member_id=member_id,
                scanned_by_user=user_id,
                scanned_device_id=device_id,
                method=method,
                status="Valid"
            )
            self.db.add(record)
            try:
                await self.db.flush()
                await self.db.refresh(record)
                return await self.get_record_by_id(candidate_id)
            except IntegrityError:
                await self.db.rollback()
                continue

        raise AppException(message="تعذر تسجيل الحضور، يرجى إعادة المحاولة")

    async def cancel_record(self, record_id: str, cancelled_by_user_id: str, reason: str) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(AttendanceRecord)
            .where(AttendanceRecord.record_id == record_id)
            .values(
                status="Cancelled",
                cancelled_by=cancelled_by_user_id,
                cancelled_at=now,
                cancellation_reason=reason
            )
        )
        await self.db.flush()
        return await self.get_record_by_id(record_id)

    async def get_session_records(
        self,
        session_id: str,
        status: Optional[str] = "Valid",
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = (
            select(
                AttendanceRecord,
                Member,
                User.full_name.label("scanned_by_name"),
                AuthorizedDevice.device_name.label("scanned_device_name")
            )
            .join(Member, AttendanceRecord.member_id == Member.member_id)
            .outerjoin(User, AttendanceRecord.scanned_by_user == User.user_id)
            .outerjoin(AuthorizedDevice, AttendanceRecord.scanned_device_id == AuthorizedDevice.device_id)
            .where(AttendanceRecord.session_id == session_id)
        )

        if status:
            query = query.where(AttendanceRecord.status == status)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Member.full_name.ilike(pattern),
                    Member.phone.ilike(pattern),
                    Member.member_id.ilike(pattern),
                )
            )

        query = query.order_by(AttendanceRecord.scanned_at.desc())
        res = await self.db.execute(query)
        rows = res.all()

        items = []
        for reg, mem, scan_user, dev_name in rows:
            items.append({
                "record_id": reg.record_id,
                "session_id": reg.session_id,
                "member_id": reg.member_id,
                "member_name": mem.full_name,
                "member_stage": mem.stage,
                "scanned_by_user": reg.scanned_by_user,
                "scanned_by_name": scan_user,
                "scanned_device_name": dev_name,
                "method": reg.method,
                "status": reg.status,
                "cancelled_by_name": None,
                "cancelled_at": reg.cancelled_at,
                "cancellation_reason": reg.cancellation_reason,
                "scanned_at": reg.scanned_at,
            })
        return items
