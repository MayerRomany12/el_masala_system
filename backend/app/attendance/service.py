from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.repository import AttendanceRepository
from app.members.repository import MemberRepository
from app.attendance.schemas import (
    AttendanceSessionCreate,
    AttendanceScanRequest,
    AttendanceCancelRequest,
    AuthorizedDeviceCreate
)
from app.core.errors import NotFoundException, BadRequestException


class AttendanceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AttendanceRepository(db)
        self.member_repo = MemberRepository(db)

    # ─── Devices ──────────────────────────────────────────────────────────────

    async def register_device(self, data: AuthorizedDeviceCreate, current_user_id: str) -> Dict[str, Any]:
        return await self.repo.create_device(device_name=data.device_name, user_id=current_user_id)

    async def list_devices() -> List[Dict[str, Any]]:
        return await self.repo.list_devices()

    # ─── Sessions ─────────────────────────────────────────────────────────────

    async def create_session(self, data: AttendanceSessionCreate, current_user_id: str) -> Dict[str, Any]:
        session_dict = {
            "event_id": data.event_id,
            "session_date": data.session_date,
            "title": data.title,
            "stage": data.stage,
            "recurrence": data.recurrence or "Weekly",
            "created_by": current_user_id,
            "status": "Open"
        }
        return await self.repo.create_session(session_dict, data.authorized_user_ids)

    async def get_session_by_id(self, session_id: str) -> Dict[str, Any]:
        session = await self.repo.get_session_by_id(session_id)
        if not session:
            raise NotFoundException(f"جلسة الحضور برقم {session_id} غير موجودة")
        return session

    async def update_session_recurrence(self, session_id: str, new_recurrence: str) -> Dict[str, Any]:
        valid_types = ["Daily", "Weekly", "Monthly", "OneTime"]
        if new_recurrence not in valid_types:
            raise BadRequestException(f"نوع التكرار غير صالح. الأنواع المسموحة: {', '.join(valid_types)}")

        session = await self.get_session_by_id(session_id)
        return await self.repo.update_session_recurrence(session_id, new_recurrence)

    async def list_sessions(
        self,
        search: Optional[str] = None,
        stage: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        page = max(1, page)
        limit = min(100, max(1, limit))
        skip = (page - 1) * limit

        items, total = await self.repo.get_sessions(
            search=search, stage=stage, status=status, skip=skip, limit=limit
        )
        return {"total": total, "page": page, "limit": limit, "items": items}

    async def update_session_status(self, session_id: str, new_status: str) -> Dict[str, Any]:
        if new_status not in ["Open", "Closed"]:
            raise BadRequestException("حالة الجلسة غير صالحة (مسموح: Open أو Closed)")
        session = await self.repo.get_session_by_id(session_id)
        if not session:
            raise NotFoundException(f"جلسة الحضور برقم {session_id} غير موجودة")

        updated = await self.repo.update_session_status(session_id, new_status)

        # M5 ↔ M6 Async Auto Detector Trigger on Session Close (Post-Commit Background Task)
        if new_status == "Closed":
            try:
                from app.followup.service import FollowupService
                followup_service = FollowupService(self.db)
                stage = session.get("stage")
                await followup_service.run_absence_detector(stage=stage if stage != "ALL" else None)
            except Exception:
                pass  # Independent background trigger failure must not rollback session closure

        return updated

    # ─── UNIFIED ATTENDANCE MOTOR (QR & Manual Entrance) ─────────────────────

    async def record_attendance(
        self,
        data: AttendanceScanRequest,
        current_user: Dict[str, Any],
        device_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        المحرك الموحد لتسجيل الحضور الفعلي بالربط الثلاثي المحكم:
        (جلسة مفتوحة Open + خادم مصرح له Servant + جهاز معتمد Header X-Device-Token + طفل نشط Active)
        """
        session_id = data.session_id
        token_or_id = data.token_or_id.strip()
        method = data.method

        # 1. Check Session Status
        session = await self.repo.get_session_by_id(session_id)
        if not session:
            raise NotFoundException(f"جلسة الحضور برقم {session_id} غير موجودة")

        if session["status"] != "Open":
            raise BadRequestException("جلسة الحضور مغلقة حالياً. لا يمكن تسجيل الحضور في جلسة مغلقة.")

        # 2. Check Authorized Servant for this Session
        user_id = current_user.get("user_id")
        user_role = current_user.get("role", "Servant")
        is_auth = await self.repo.is_user_authorized_for_session(session_id, user_id, user_role)
        if not is_auth:
            raise BadRequestException("عذراً، الخادم الحالي غير مصرح له بتسجيل الحضور في هذه الجلسة المحددة لخدام آخرين.")

        # 3. Check Authorized Device (via X-Device-Token Header)
        device_id = None
        if device_token:
            device = await self.repo.get_device_by_token(device_token)
            if device:
                device_id = device["device_id"]
                await self.repo.update_device_last_used(device_id)

        # 4. Resolve Member by QR Token OR Member ID (K-XXXXXX)
        member = None
        # Try QR token first
        member = await self.member_repo.get_by_qr_token(token_or_id)
        if not member:
            # Try Member ID
            member = await self.member_repo.get_by_member_id(token_or_id)

        if not member:
            raise NotFoundException(f"تعذر العثور على بيانات المخدوم بالرمز المدخل ({token_or_id}). يرجى التأكد من بطاقة الـ QR أو رمز K-XXXXXX.")

        # 5. Check Member Active Status
        if member["status"] != "Active":
            raise BadRequestException(f"تعذر تسجيل حضور الطفل ({member['full_name']}) لأن حسابه غير نشط (حالة الحساب الحالية: {member['status']}).")

        # 6. Check Duplicate Attendance in this Session
        existing_rec = await self.repo.get_record_by_session_and_member(session_id, member["member_id"])
        if existing_rec and existing_rec["status"] == "Valid":
            scanned_time = existing_rec["scanned_at"]
            time_str = scanned_time.strftime("%I:%M %p") if hasattr(scanned_time, "strftime") else str(scanned_time)
            raise BadRequestException(f"الطفل ({member['full_name']}) مسجل حضوره بالفعل في هذه الجلسة (الساعة {time_str}).")

        # 7. Record Attendance
        rec = await self.repo.create_record(
            session_id=session_id,
            member_id=member["member_id"],
            user_id=user_id,
            device_id=device_id,
            method=method
        )

        # 8. Auto-Award +10 Attendance Points to Member Ledger
        try:
            from app.rewards.service import RewardsService
            rewards_service = RewardsService(self.db)
            await rewards_service.award_attendance_points(member["member_id"], session_id)
        except Exception:
            pass

        return rec

    async def cancel_attendance_record(
        self,
        record_id: str,
        current_user_id: str,
        reason: str
    ) -> Dict[str, Any]:
        rec = await self.repo.get_record_by_id(record_id)
        if not rec:
            raise NotFoundException(f"سجل الحضور برقم {record_id} غير موجود")

        if rec.get("status") == "Cancelled":
            raise BadRequestException("سجل الحضور ملغي بالفعل من قبل")

        # 1. Cancel Attendance Record
        cancelled_rec = await self.repo.cancel_record(
            record_id=record_id,
            cancelled_by_user_id=current_user_id,
            reason=reason
        )

        # 2. M5 ↔ M7 Atomic Points Reversal: Deduct 10 points and record Reversal entry
        try:
            from app.rewards.repository import RewardsRepository
            rewards_repo = RewardsRepository(self.db)
            member_id = rec["member_id"]
            session_id = rec["session_id"]
            await rewards_repo.record_transaction(
                member_id=member_id,
                points=-10,
                type_str="Reversal",
                session_id=session_id,
                reason=f"إلغاء سجل حضور الجلسة ({session_id}) — السبب: {reason}",
                created_by=current_user_id
            )
        except Exception:
            pass

        return cancelled_rec

    async def get_session_records(
        self,
        session_id: str,
        status: Optional[str] = "Valid",
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        session = await self.repo.get_session_by_id(session_id)
        if not session:
            raise NotFoundException(f"جلسة الحضور برقم {session_id} غير موجودة")

        return await self.repo.get_session_records(session_id=session_id, status=status, search=search)
