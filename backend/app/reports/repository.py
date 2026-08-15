from typing import Optional, List, Dict, Any
from datetime import date
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.member import Member
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.event import Event, EventRegistration
from app.models.followup import FollowupTask, FollowupLog
from app.models.birthday import BirthdayGiftDelivery


class ReportsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_attendance_report(
        self,
        stage: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        query = select(AttendanceSession).where(AttendanceSession.status != "Cancelled")
        if stage and stage != "ALL":
            stage_prefix = stage.split('-')[0].strip()
            query = query.where(
                or_(AttendanceSession.stage == "ALL",
                    AttendanceSession.stage.ilike(f"%{stage_prefix}%"))
            )
        if from_date:
            query = query.where(AttendanceSession.session_date >= from_date)
        if to_date:
            query = query.where(AttendanceSession.session_date <= to_date)

        query = query.order_by(AttendanceSession.session_date.desc(), AttendanceSession.created_at.desc())
        sessions = (await self.db.execute(query)).scalars().all()

        results = []
        for s in sessions:
            # 1. Targeted Active Members (matching stage per M5 rules)
            mem_q = select(func.count(Member.member_id)).where(Member.status == "Active")
            if s.stage and s.stage != "ALL":
                stg_pref = s.stage.split('-')[0].strip()
                mem_q = mem_q.where(Member.stage.ilike(f"%{stg_pref}%"))
            targeted_count = (await self.db.execute(mem_q)).scalar_one()

            # 2. Present Valid Records only
            rec_q = select(func.count(AttendanceRecord.record_id)).where(
                AttendanceRecord.session_id == s.session_id,
                AttendanceRecord.status == "Valid"
            )
            present_count = (await self.db.execute(rec_q)).scalar_one()

            pct = round((present_count / targeted_count) * 100.0, 1) if targeted_count > 0 else 0.0

            results.append({
                "session_id": s.session_id,
                "session_date": str(s.session_date),
                "stage": s.stage,
                "session_title": s.title or f"جلسة {s.stage}",
                "targeted_members_count": targeted_count,
                "present_count": present_count,
                "attendance_percentage": pct
            })
        return results

    async def get_financial_report(
        self,
        event_type: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        query = select(Event).where(Event.status != "Cancelled")
        if event_type and event_type != "ALL":
            query = query.where(Event.event_type == event_type)
        if from_date:
            query = query.where(Event.event_date >= from_date)
        if to_date:
            query = query.where(Event.event_date <= to_date)

        query = query.order_by(Event.event_date.desc(), Event.created_at.desc())
        events = (await self.db.execute(query)).scalars().all()

        results = []
        for e in events:
            reg_q = select(EventRegistration).where(EventRegistration.event_id == e.event_id)
            regs = (await self.db.execute(reg_q)).scalars().all()

            reg_count = len(regs)
            event_fee = float(e.fee or 0.0)
            total_base = round(event_fee * reg_count, 2)

            att_disc = round(sum(float(r.attendance_discount_amount or 0.0) for r in regs), 2)
            pts_disc = round(sum(float(r.points_discount_amount or 0.0) for r in regs), 2)
            amount_due = round(sum(float(r.amount_due or 0.0) for r in regs), 2)
            amount_paid = round(sum(float(r.amount_paid or 0.0) for r in regs), 2)
            remaining = round(max(0.0, amount_due - amount_paid), 2)

            results.append({
                "event_id": e.event_id,
                "event_title": e.title,
                "event_type": e.event_type,
                "event_fee": event_fee,
                "registrations_count": reg_count,
                "total_base_fee": total_base,
                "total_attendance_discount": att_disc,
                "total_points_discount": pts_disc,
                "total_amount_due": amount_due,
                "total_amount_paid": amount_paid,
                "total_remaining": remaining
            })
        return results

    async def get_followup_report(self) -> Dict[str, Any]:
        tasks = (await self.db.execute(select(FollowupTask))).scalars().all()
        logs = (await self.db.execute(select(FollowupLog))).scalars().all()

        total = len(tasks)
        pending = sum(1 for t in tasks if t.status == "Pending")
        completed = sum(1 for t in tasks if t.status == "Completed")
        escalated = sum(1 for t in tasks if t.status == "Escalated")
        # Urgent: High or Urgent priority, or Escalated status
        urgent = sum(1 for t in tasks if t.priority in ("High", "Urgent") or t.status == "Escalated")

        outcomes: Dict[str, int] = {}
        for log in logs:
            if log.outcome:
                outcomes[log.outcome] = outcomes.get(log.outcome, 0) + 1

        return {
            "total_active_tasks": total,
            "pending_tasks_count": pending,
            "completed_tasks_count": completed,
            "escalated_tasks_count": escalated,
            "urgent_priority_count": urgent,
            "outcomes_breakdown": outcomes
        }

    async def get_birthday_report(self, year: Optional[int] = None) -> Dict[str, Any]:
        target_year = year or date.today().year

        # Count Active members who have a date_of_birth recorded
        total_q = select(func.count(Member.member_id)).where(
            Member.status == "Active",
            Member.date_of_birth.isnot(None)  # column is date_of_birth (String), not dob
        )
        total_members = (await self.db.execute(total_q)).scalar_one()

        deliv_q = select(func.count(BirthdayGiftDelivery.delivery_id)).where(
            BirthdayGiftDelivery.year == target_year
        )
        delivered = (await self.db.execute(deliv_q)).scalar_one()

        pending = max(0, total_members - delivered)
        rate = round((delivered / total_members) * 100.0, 1) if total_members > 0 else 0.0

        return {
            "year": target_year,
            "total_eligible_children": total_members,
            "delivered_gifts_count": delivered,
            "pending_gifts_count": pending,
            "delivery_rate_pct": rate
        }
