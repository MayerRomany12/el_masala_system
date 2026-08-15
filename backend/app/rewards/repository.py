import secrets
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timezone

from sqlalchemy import select, update, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.rewards import PointsTransaction
from app.models.member import Member
from app.models.user import User
from app.models.event import Event, EventRegistration
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.core.errors import AppException, BadRequestException


class RewardsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_member_attendance_percentage(
        self,
        member_id: str,
        member_stage: str,
        last_n_sessions: int = 8
    ) -> Tuple[float, int, int]:
        """
        حساب نسبة حضور الطفل في آخر N جلسات مغلقة/ماضية لمرحلته
        تُرجع: (نسبة الحضور %, عدد الجلسات الحاضر بها, إجمالي الجلسات)
        """
        query = select(AttendanceSession).order_by(AttendanceSession.session_date.desc(), AttendanceSession.created_at.desc())
        if member_stage:
            stage_prefix = member_stage.split('-')[0].strip()
            query = query.where(or_(AttendanceSession.stage == "ALL", AttendanceSession.stage.ilike(f"%{stage_prefix}%")))

        sessions = (await self.db.execute(query.limit(last_n_sessions))).scalars().all()
        if not sessions:
            return 100.0, 0, 0 # Default 100% for new members without past sessions

        total_sessions = len(sessions)
        session_ids = [s.session_id for s in sessions]

        rec_q = select(func.count(AttendanceRecord.record_id)).where(
            AttendanceRecord.session_id.in_(session_ids),
            AttendanceRecord.member_id == member_id,
            AttendanceRecord.status == "Valid"
        )
        present_count = (await self.db.execute(rec_q)).scalar_one()

        pct = round((present_count / total_sessions) * 100.0, 1)
        return pct, present_count, total_sessions

    async def record_transaction(
        self,
        member_id: str,
        points: int,
        type_str: str,
        reason: str,
        event_id: Optional[str] = None,
        session_id: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Atomic Ledger Update:
        تحديث points_transactions (Ledger) وحقل member.total_points (Cached Balance) ذرياً.
        """
        res = await self.db.execute(select(Member).where(Member.member_id == member_id))
        member = res.scalar_one_or_none()
        if not member:
            raise BadRequestException(f"المخدوم برقم العضوية {member_id} غير موجود")

        current_points = int(member.total_points or 0)
        new_balance = current_points + points

        if new_balance < 0:
            raise BadRequestException(f"رصيد النقاط الحالي المتاح ({current_points} نقطة) لا يكفي لعملية الخصم/الاستبدال المطلوبة ({abs(points)} نقطة)")

        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"PTS-{rand_num:06d}"

            txn = PointsTransaction(
                transaction_id=candidate_id,
                member_id=member_id,
                points=points,
                type=type_str,
                event_id=event_id,
                session_id=session_id,
                reason=reason,
                created_by=created_by
            )
            self.db.add(txn)
            try:
                await self.db.flush()
                # Update Cached Balance on Member
                await self.db.execute(
                    update(Member)
                    .where(Member.member_id == member_id)
                    .values(total_points=new_balance, updated_at=datetime.now(timezone.utc))
                )
                await self.db.flush()

                return await self.get_transaction_by_id(candidate_id)
            except IntegrityError:
                await self.db.rollback()
                continue

        raise AppException(message="تعذر تسجيل معاملة النقاط المالية")

    async def get_transaction_by_id(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        query = (
            select(PointsTransaction, Member.full_name.label("member_name"), User.full_name.label("created_by_name"))
            .join(Member, PointsTransaction.member_id == Member.member_id)
            .outerjoin(User, PointsTransaction.created_by == User.user_id)
            .where(PointsTransaction.transaction_id == transaction_id)
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            return None
        txn, mem_name, user_name = row
        return {
            "transaction_id": txn.transaction_id,
            "member_id": txn.member_id,
            "member_name": mem_name,
            "points": txn.points,
            "type": txn.type,
            "event_id": txn.event_id,
            "session_id": txn.session_id,
            "reason": txn.reason,
            "created_by_name": user_name,
            "created_at": txn.created_at
        }

    async def get_member_points_ledger(self, member_id: str) -> List[Dict[str, Any]]:
        query = (
            select(PointsTransaction, User.full_name.label("created_by_name"))
            .outerjoin(User, PointsTransaction.created_by == User.user_id)
            .where(PointsTransaction.member_id == member_id)
            .order_by(PointsTransaction.created_at.desc())
        )
        res = await self.db.execute(query)
        rows = res.all()
        return [{
            "transaction_id": t.transaction_id,
            "member_id": t.member_id,
            "points": t.points,
            "type": t.type,
            "event_id": t.event_id,
            "session_id": t.session_id,
            "reason": t.reason,
            "created_by_name": u_name,
            "created_at": t.created_at
        } for t, u_name in rows]

    async def get_leaderboard(self, stage: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        query = select(Member).where(Member.status == "Active")
        if stage and stage != "ALL":
            stage_prefix = stage.split('-')[0].strip()
            query = query.where(Member.stage.ilike(f"%{stage_prefix}%"))

        query = query.order_by(Member.total_points.desc()).limit(limit)
        members = (await self.db.execute(query)).scalars().all()

        leaderboard = []
        for idx, m in enumerate(members, 1):
            pct, _, _ = await self.calculate_member_attendance_percentage(m.member_id, m.stage, last_n_sessions=8)
            leaderboard.append({
                "rank": idx,
                "member_id": m.member_id,
                "full_name": m.full_name,
                "stage": m.stage,
                "total_points": int(m.total_points or 0),
                "attendance_percentage": pct
            })
        return leaderboard
