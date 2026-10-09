import secrets
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, date, timezone

from sqlalchemy import select, update, delete, func, or_, and_, String, Date
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
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, str):
        cleaned = d.strip().split("T")[0]
        try:
            return datetime.strptime(cleaned, "%Y-%m-%d").date()
        except Exception:
            return date.fromisoformat(cleaned)
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

        now_utc = datetime.now(timezone.utc)
        if session_data.get("status") == "Open" and "opened_at" not in session_data:
            session_data["opened_at"] = now_utc

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

    async def _evaluate_lazy_void(self):
        """Atomic Lazy Void Evaluation to eliminate race conditions"""
        now_ts = datetime.now(timezone.utc)
        today_date = date.today()
        stmt = (
            update(AttendanceSession)
            .where(
                AttendanceSession.status == "Scheduled",
                or_(
                    and_(AttendanceSession.scheduled_end_time != None, AttendanceSession.scheduled_end_time < now_ts),
                    and_(AttendanceSession.session_date < today_date, AttendanceSession.opened_at == None)
                )
            )
            .values(status="Void", updated_at=now_ts)
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def get_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        await self._evaluate_lazy_void()
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

        # Historical Target Formula (Timestamp-based)
        session_ts = s_row.opened_at or s_row.scheduled_start_time
        if not session_ts:
            if isinstance(s_row.session_date, datetime):
                session_ts = s_row.session_date
            elif isinstance(s_row.session_date, date):
                session_ts = datetime.combine(s_row.session_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            else:
                session_ts = datetime.now(timezone.utc)

        if s_row.class_id:
            from app.models.class_group import ClassGroupMember
            clean_cid = s_row.class_id.strip().upper()
            target_q = (
                select(func.count(ClassGroupMember.membership_id))
                .join(Member, func.upper(ClassGroupMember.member_id) == func.upper(Member.member_id))
                .where(
                    func.upper(ClassGroupMember.class_id) == clean_cid,
                    ClassGroupMember.is_active == True,
                    Member.is_archived == False
                )
            )
        else:
            target_q = select(func.count(Member.member_id)).where(Member.status == "Active", Member.is_archived == False)
            if s_row.stage and s_row.stage != "ALL":
                target_q = target_q.where(Member.stage.ilike(f"%{s_row.stage.split('-')[0].strip()}%"))

        targeted_count = (await self.db.execute(target_q)).scalar_one()
        pct = round((present_count / targeted_count * 100), 1) if targeted_count > 0 else 0.0

        class_name = None
        if s_row.class_id:
            from app.models.class_group import ClassGroup
            cg_res = await self.db.execute(select(ClassGroup.name).where(ClassGroup.class_id == s_row.class_id))
            class_name = cg_res.scalar_one_or_none()

        return {
            "session_id": s_row.session_id,
            "event_id": s_row.event_id,
            "class_id": s_row.class_id,
            "class_name": class_name,
            "session_date": s_row.session_date.isoformat() if isinstance(s_row.session_date, (date, datetime)) else str(s_row.session_date),
            "scheduled_start_time": s_row.scheduled_start_time,
            "scheduled_end_time": s_row.scheduled_end_time,
            "opened_at": s_row.opened_at,
            "closed_at": s_row.closed_at,
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
        class_id: Optional[str] = None,
        status: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        await self._evaluate_lazy_void()
        query = select(AttendanceSession)

        if class_id:
            query = query.where(AttendanceSession.class_id == class_id)
        elif allowed_class_ids is not None:
            query = query.where(AttendanceSession.class_id.in_(allowed_class_ids))

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
        now_ts = datetime.now(timezone.utc)
        update_vals = {"status": new_status, "updated_at": now_ts}
        if new_status == "Open":
            update_vals["opened_at"] = now_ts
        elif new_status in ["Completed", "Closed"]:
            update_vals["closed_at"] = now_ts
            update_vals["status"] = "Completed"

        await self.db.execute(
            update(AttendanceSession)
            .where(AttendanceSession.session_id == session_id)
            .values(**update_vals)
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

    async def get_session_sheet(self, session_id: str, search: Optional[str] = None) -> Dict[str, Any]:
        """
        جلب شيت الحضور والغياب المرقم والمنسق للفصل بالكامل
        موضحاً مين حضر ومين غاب مع الإحصائيات الفورية.
        """
        session_info = await self.get_session_by_id(session_id)
        if not session_info:
            return {}

        from app.models.class_group import ClassGroupMember

        if session_info.get("class_id"):
            clean_cid = session_info["class_id"].strip().upper()
            mem_q = (
                select(
                    Member.member_id,
                    Member.full_name,
                    Member.phone,
                    Member.whatsapp_phone,
                    Member.area,
                    Member.stage,
                    Member.photo_url
                )
                .join(ClassGroupMember, func.upper(Member.member_id) == func.upper(ClassGroupMember.member_id))
                .where(
                    func.upper(ClassGroupMember.class_id) == clean_cid,
                    ClassGroupMember.is_active == True,
                    Member.is_archived == False
                )
            )
        else:
            mem_q = select(
                Member.member_id,
                Member.full_name,
                Member.phone,
                Member.whatsapp_phone,
                Member.area,
                Member.stage,
                Member.photo_url
            ).where(Member.is_archived == False)
            if session_info.get("stage") and session_info["stage"] != "ALL":
                mem_q = mem_q.where(Member.stage == session_info["stage"])

        if search:
            p = f"%{search.strip()}%"
            mem_q = mem_q.where(
                or_(
                    Member.full_name.ilike(p),
                    Member.member_id.ilike(p),
                    Member.phone.ilike(p),
                    Member.area.ilike(p)
                )
            )

        mem_q = mem_q.order_by(Member.full_name.asc())
        mem_rows = (await self.db.execute(mem_q)).all()

        rec_q = select(AttendanceRecord).where(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.status == "Valid"
        )
        rec_res = await self.db.execute(rec_q)
        records = {r.member_id: r for r in rec_res.scalars().all()}

        members_list = []
        present_count = 0
        for idx, row in enumerate(mem_rows, 1):
            mid = row.member_id
            is_present = (mid in records)
            if is_present:
                present_count += 1
            rec = records.get(mid)
            members_list.append({
                "index": idx,
                "member_id": mid,
                "full_name": row.full_name,
                "phone": row.phone or "",
                "whatsapp_phone": row.whatsapp_phone or row.phone or "",
                "area": row.area or "غير محدد",
                "stage": row.stage,
                "photo_url": row.photo_url,
                "is_present": is_present,
                "attended": is_present,
                "record_id": rec.record_id if rec else None,
                "method": rec.method if rec else None,
                "scanned_at": rec.scanned_at.isoformat() if rec and rec.scanned_at else None
            })

        total_members = len(members_list)
        absent_count = total_members - present_count
        rate = round((present_count / total_members * 100), 1) if total_members > 0 else 0.0

        stats_dict = {
            "total_members": total_members,
            "present_count": present_count,
            "absent_count": absent_count,
            "attendance_rate": rate
        }

        return {
            "session": session_info,
            "summary": stats_dict,
            "stats": stats_dict,
            "members": members_list,
            "items": members_list
        }

    async def close_all_open_sessions(
        self,
        class_id: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None
    ) -> int:
        now_ts = datetime.now(timezone.utc)
        stmt = (
            update(AttendanceSession)
            .where(AttendanceSession.status == "Open")
        )
        if class_id:
            stmt = stmt.where(func.upper(AttendanceSession.class_id) == class_id.strip().upper())
        elif allowed_class_ids is not None:
            clean_allowed = [cid.strip().upper() for cid in allowed_class_ids]
            stmt = stmt.where(func.upper(AttendanceSession.class_id).in_(clean_allowed))

        stmt = stmt.values(status="Completed", closed_at=now_ts, updated_at=now_ts)
        res = await self.db.execute(stmt)
        await self.db.flush()
        return res.rowcount

    async def toggle_member_attendance(
        self,
        session_id: str,
        member_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        تبديل حالة حضور المخدوم فورياً بنقرة واحدة (حاضر / غائب) في كشف الفصل.
        """
        existing = await self.get_record_by_session_and_member(session_id, member_id)
        if existing and existing["status"] == "Valid":
            # إلغاء وتسجيل غياب
            await self.cancel_record(existing["record_id"], user_id, "تسجيل غياب من كشف الفصل")
            return {"action": "unmarked", "member_id": member_id, "is_present": False}
        else:
            if existing and existing["status"] == "Cancelled":
                now_ts = datetime.now(timezone.utc)
                await self.db.execute(
                    update(AttendanceRecord)
                    .where(AttendanceRecord.record_id == existing["record_id"])
                    .values(
                        status="Valid",
                        scanned_by_user=user_id,
                        method="Manual",
                        scanned_at=now_ts,
                        cancelled_by=None,
                        cancelled_at=None,
                        cancellation_reason=None
                    )
                )
                await self.db.flush()
                rec = await self.get_record_by_id(existing["record_id"])
            else:
                rec = await self.create_record(
                    session_id=session_id,
                    member_id=member_id,
                    user_id=user_id,
                    method="Manual"
                )
            return {"action": "marked", "member_id": member_id, "is_present": True, "record": rec}

