from typing import Optional, List, Dict, Any
from datetime import date, datetime
from sqlalchemy import select, func, or_, and_, exists, text
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
        class_id: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        from app.models.class_group import ClassGroup
        query = select(AttendanceSession, ClassGroup.name.label("class_name")).outerjoin(
            ClassGroup, AttendanceSession.class_id == ClassGroup.class_id
        ).where(AttendanceSession.status != "Cancelled")

        if class_id:
            query = query.where(AttendanceSession.class_id == class_id)
        elif allowed_class_ids is not None:
            query = query.where(AttendanceSession.class_id.in_(allowed_class_ids))

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
        sessions = (await self.db.execute(query)).all()

        results = []
        for s, class_name in sessions:
            # 1. Targeted Active Members
            if s.class_id:
                from app.models.class_group import ClassGroupMember
                target_q = select(func.count(ClassGroupMember.membership_id)).where(
                    ClassGroupMember.class_id == s.class_id,
                    ClassGroupMember.is_active == True
                )
            else:
                target_q = select(func.count(Member.member_id)).where(Member.status == "Active")
                if s.stage and s.stage != "ALL":
                    stg_pref = s.stage.split('-')[0].strip()
                    target_q = target_q.where(Member.stage.ilike(f"%{stg_pref}%"))
            targeted_count = (await self.db.execute(target_q)).scalar_one()

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
                "class_id": s.class_id,
                "class_name": class_name or "اجتماع عام",
                "stage": s.stage,
                "session_title": s.title or f"جلسة {s.stage}",
                "targeted_members_count": targeted_count,
                "present_count": present_count,
                "absent_count": max(0, targeted_count - present_count),
                "attendance_percentage": pct
            })
        return results

    async def get_who_attended_report(
        self,
        session_id: Optional[str] = None,
        class_id: Optional[str] = None,
        stage: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        allowed_class_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        تقرير تفصيلي بأسماء المخدومين الحاضرين (مين حضر)
        """
        from app.models.class_group import ClassGroup
        query = (
            select(
                AttendanceRecord,
                Member,
                AttendanceSession.session_date,
                AttendanceSession.title.label("session_title"),
                ClassGroup.name.label("class_name")
            )
            .join(Member, AttendanceRecord.member_id == Member.member_id)
            .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.session_id)
            .outerjoin(ClassGroup, AttendanceSession.class_id == ClassGroup.class_id)
            .where(AttendanceRecord.status == "Valid")
        )

        if session_id:
            query = query.where(AttendanceRecord.session_id == session_id)
        if class_id:
            query = query.where(AttendanceSession.class_id == class_id)
        elif allowed_class_ids is not None:
            query = query.where(AttendanceSession.class_id.in_(allowed_class_ids))

        if stage and stage != "ALL":
            stage_prefix = stage.split('-')[0].strip()
            query = query.where(or_(Member.stage.ilike(f"%{stage_prefix}%"), AttendanceSession.stage.ilike(f"%{stage_prefix}%")))
        if from_date:
            query = query.where(AttendanceSession.session_date >= from_date)
        if to_date:
            query = query.where(AttendanceSession.session_date <= to_date)

        query = query.order_by(AttendanceSession.session_date.desc(), Member.full_name.asc())
        rows = (await self.db.execute(query)).all()

        results = []
        for idx, (rec, mem, s_date, s_title, c_name) in enumerate(rows, 1):
            results.append({
                "index": idx,
                "member_id": mem.member_id,
                "full_name": mem.full_name,
                "class_name": c_name or "اجتماع عام",
                "stage": mem.stage,
                "area": getattr(mem, "area", None) or "غير محدد",
                "phone": mem.phone or "",
                "session_date": str(s_date),
                "session_title": s_title,
                "method": rec.method,
                "scanned_at": rec.scanned_at.strftime("%I:%M %p") if rec.scanned_at else ""
            })
        return results

    async def get_who_was_absent_report(
        self,
        session_id: Optional[str] = None,
        class_id: Optional[str] = None,
        stage: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        allowed_class_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        تقرير تفصيلي بأسماء المخدومين الغائبين (مين غاب) لجلسة أو لفصل ومرحلة
        """
        from app.models.class_group import ClassGroup, ClassGroupMember

        # First find matching sessions
        s_query = select(AttendanceSession, ClassGroup.name.label("class_name")).outerjoin(
            ClassGroup, AttendanceSession.class_id == ClassGroup.class_id
        ).where(AttendanceSession.status.in_(["Open", "Completed"]))

        if session_id:
            s_query = s_query.where(AttendanceSession.session_id == session_id)
        if class_id:
            s_query = s_query.where(AttendanceSession.class_id == class_id)
        elif allowed_class_ids is not None:
            s_query = s_query.where(AttendanceSession.class_id.in_(allowed_class_ids))

        if stage and stage != "ALL":
            s_query = s_query.where(AttendanceSession.stage.ilike(f"%{stage.split('-')[0].strip()}%"))
        if from_date:
            s_query = s_query.where(AttendanceSession.session_date >= from_date)
        if to_date:
            s_query = s_query.where(AttendanceSession.session_date <= to_date)

        s_query = s_query.order_by(AttendanceSession.session_date.desc()).limit(20)
        sessions = (await self.db.execute(s_query)).all()

        absent_records = []
        idx = 1
        for s, c_name in sessions:
            # Get members that belong to this session
            if s.class_id:
                mem_q = select(Member).join(ClassGroupMember, Member.member_id == ClassGroupMember.member_id).where(
                    ClassGroupMember.class_id == s.class_id,
                    ClassGroupMember.is_active == True,
                    Member.is_archived == False
                )
            else:
                mem_q = select(Member).where(Member.is_archived == False, Member.status == "Active")
                if s.stage and s.stage != "ALL":
                    mem_q = mem_q.where(Member.stage.ilike(f"%{s.stage.split('-')[0].strip()}%"))

            members = (await self.db.execute(mem_q.order_by(Member.full_name.asc()))).scalars().all()

            # Find who attended
            rec_q = select(AttendanceRecord.member_id).where(
                AttendanceRecord.session_id == s.session_id,
                AttendanceRecord.status == "Valid"
            )
            attended_mids = set((await self.db.execute(rec_q)).scalars().all())

            for m in members:
                if m.member_id not in attended_mids:
                    absent_records.append({
                        "index": idx,
                        "member_id": m.member_id,
                        "full_name": m.full_name,
                        "class_name": c_name or "اجتماع عام",
                        "stage": m.stage,
                        "area": getattr(m, "area", None) or "غير محدد",
                        "phone": m.phone or "",
                        "whatsapp_phone": getattr(m, "whatsapp_phone", None) or m.phone or "",
                        "session_date": str(s.session_date),
                        "session_title": s.title
                    })
                    idx += 1

        return absent_records

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

    async def get_birthday_report(
        self,
        year: Optional[int] = None,
        month: Optional[int] = None,
        stage: Optional[str] = None,
        class_id: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None,
        gift_status: Optional[str] = None
    ) -> Dict[str, Any]:
        target_year = year or date.today().year

        items = await self.get_birthdays_detailed_report(
            year=target_year,
            month=month,
            stage=stage,
            class_id=class_id,
            allowed_class_ids=allowed_class_ids,
            gift_status=gift_status
        )

        total_members = len(items)
        delivered = sum(1 for it in items if "تم التسليم" in str(it.get("gift_status", "")))
        pending = max(0, total_members - delivered)
        rate = round((delivered / total_members) * 100.0, 1) if total_members > 0 else 0.0

        summary_dict = {
            "year": target_year,
            "total_eligible_children": total_members,
            "delivered_gifts_count": delivered,
            "pending_gifts_count": pending,
            "delivery_rate_pct": rate
        }

        return {
            "summary": summary_dict,
            "year": target_year,
            "total_eligible_children": total_members,
            "delivered_gifts_count": delivered,
            "pending_gifts_count": pending,
            "delivery_rate_pct": rate,
            "items": items,
            "total": total_members
        }

    async def get_members_master_report(
        self,
        stage: Optional[str] = None,
        class_id: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        from app.models.class_group import ClassGroup, ClassGroupMember
        from sqlalchemy import exists

        query = select(Member).where(Member.is_archived == False)

        if class_id:
            clean_cid = class_id.strip().upper()
            query = query.where(
                exists(
                    select(1).select_from(ClassGroupMember).where(
                        func.upper(func.trim(ClassGroupMember.member_id)) == func.upper(func.trim(Member.member_id)),
                        func.upper(func.trim(ClassGroupMember.class_id)) == clean_cid,
                        ClassGroupMember.is_active == True
                    )
                )
            )
        elif allowed_class_ids is not None:
            clean_allowed = [c.strip().upper() for c in allowed_class_ids]
            query = query.where(
                exists(
                    select(1).select_from(ClassGroupMember).where(
                        func.upper(func.trim(ClassGroupMember.member_id)) == func.upper(func.trim(Member.member_id)),
                        func.upper(func.trim(ClassGroupMember.class_id)).in_(clean_allowed),
                        ClassGroupMember.is_active == True
                    )
                )
            )

        if stage and stage != "ALL":
            stage_prefix = stage.split('-')[0].strip()
            query = query.where(Member.stage.ilike(f"%{stage_prefix}%"))
        query = query.order_by(Member.stage.asc(), Member.full_name.asc())
        members = (await self.db.execute(query)).scalars().all()

        if not members:
            return []

        member_ids = [m.member_id for m in members]
        from app.models.class_group import ClassGroup, ClassGroupMember
        cgm_query = (
            select(
                ClassGroupMember.member_id,
                ClassGroup.name.label("class_name")
            )
            .join(ClassGroup, ClassGroupMember.class_id == ClassGroup.class_id)
            .where(
                ClassGroupMember.member_id.in_(member_ids),
                ClassGroupMember.is_active == True
            )
            .order_by(ClassGroup.group_type.asc(), ClassGroupMember.joined_at.asc(), ClassGroup.name.asc())
        )
        cgm_res = await self.db.execute(cgm_query)
        classes_map = {}
        for row in cgm_res.all():
            classes_map.setdefault(row.member_id, []).append(row.class_name)

        results = []
        for m in members:
            classes_list = classes_map.get(m.member_id, [])
            classes_str = " | ".join(classes_list) if classes_list else (m.stage or "غير مسكن")
            results.append({
                "member_id": m.member_id,
                "full_name": m.full_name,
                "active_classes": classes_str,
                "gender": m.gender or "—",
                "date_of_birth": str(m.date_of_birth) if m.date_of_birth else "—",
                "stage": m.stage or "—",
                "phone": m.phone or "—",
                "secondary_phone": m.secondary_phone or "—",
                "member_phone": m.member_phone or "—",
                "whatsapp_phone": m.whatsapp_phone or "—",
                "father_of_confession": m.father_of_confession or "—",
                "address": m.address or "—",
                "notes": m.notes or "—",
                "status": "نشط" if m.status == "Active" else ("غير نشط" if m.status == "Inactive" else m.status),
                "created_at": m.created_at.strftime("%Y/%m/%d") if m.created_at else "—"
            })
        return results

    async def get_followup_detailed_report(self) -> List[Dict[str, Any]]:
        from app.models.user import User
        query = (
            select(FollowupTask, Member.full_name.label("member_name"), Member.stage, User.full_name.label("servant_name"))
            .join(Member, FollowupTask.member_id == Member.member_id)
            .outerjoin(User, FollowupTask.assigned_servant_id == User.user_id)
            .order_by(FollowupTask.created_at.desc())
        )
        res = await self.db.execute(query)
        results = []
        for task, mem_name, stg, srv_name in res.all():
            results.append({
                "task_id": task.task_id,
                "member_name": mem_name,
                "assigned_to": srv_name or "غير مكلف",
                "stage": stg or "—",
                "reason": task.reason or task.task_type or "غياب",
                "priority": task.priority or "Normal",
                "status": task.status or "Pending",
                "due_date": str(task.due_date) if task.due_date else "—",
                "created_at": task.created_at.strftime("%Y/%m/%d") if task.created_at else "—"
            })
        return results

    async def get_birthdays_detailed_report(
        self,
        year: Optional[int] = None,
        month: Optional[int] = None,
        stage: Optional[str] = None,
        class_id: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None,
        gift_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        target_year = year or date.today().year
        from app.models.user import User
        from app.models.class_group import ClassGroup, ClassGroupMember
        from app.birthdays.repository import _parse_dob_string

        query = (
            select(
                Member,
                BirthdayGiftDelivery.delivery_id,
                BirthdayGiftDelivery.delivered_at,
                User.full_name.label("servant_name")
            )
            .outerjoin(
                BirthdayGiftDelivery,
                (BirthdayGiftDelivery.member_id == Member.member_id) & (BirthdayGiftDelivery.year == target_year)
            )
            .outerjoin(User, BirthdayGiftDelivery.delivered_by == User.user_id)
            .where(Member.status == "Active", Member.is_archived == False, Member.date_of_birth.isnot(None))
        )

        if class_id:
            query = query.where(
                Member.member_id.in_(
                    select(ClassGroupMember.member_id).where(
                        ClassGroupMember.class_id == class_id,
                        ClassGroupMember.is_active == True
                    )
                )
            )
        elif allowed_class_ids is not None:
            query = query.where(
                Member.member_id.in_(
                    select(ClassGroupMember.member_id).where(
                        ClassGroupMember.class_id.in_(allowed_class_ids),
                        ClassGroupMember.is_active == True
                    )
                )
            )

        if stage and stage != "ALL":
            stage_prefix = stage.split('-')[0].strip()
            query = query.where(Member.stage.ilike(f"%{stage_prefix}%"))

        res = await self.db.execute(query)
        rows = res.all()

        # Batch load active class names
        member_ids = [r[0].member_id for r in rows]
        class_map = {}
        if member_ids:
            c_res = await self.db.execute(
                select(ClassGroupMember.member_id, ClassGroup.name)
                .join(ClassGroup, ClassGroupMember.class_id == ClassGroup.class_id)
                .where(ClassGroupMember.member_id.in_(member_ids), ClassGroupMember.is_active == True)
            )
            for m_id, c_name in c_res.all():
                if m_id not in class_map:
                    class_map[m_id] = c_name

        results = []
        for mem, deliv_id, deliv_at, srv_name in rows:
            dob_val = _parse_dob_string(mem.date_of_birth)
            if not dob_val:
                continue

            b_month, b_day = dob_val.month, dob_val.day
            if month is not None and b_month != month:
                continue

            is_delivered = deliv_id is not None
            status_label = "تم التسليم 🎁" if is_delivered else "معلق لم يستلم ⏳"

            if gift_status and gift_status != "ALL":
                if gift_status in ("Delivered", "تم التسليم") and not is_delivered:
                    continue
                if gift_status in ("Pending", "معلق") and is_delivered:
                    continue

            results.append({
                "index": 1,
                "member_id": mem.member_id,
                "full_name": mem.full_name,
                "class_name": class_map.get(mem.member_id, mem.stage or "—"),
                "date_of_birth": dob_val.isoformat() if isinstance(dob_val, (date, datetime)) else str(dob_val),
                "birthday_day": b_day,
                "birthday_month": b_month,
                "stage": mem.stage or "—",
                "area": getattr(mem, "area", None) or "غير محدد",
                "gift_status": status_label,
                "delivered_at": deliv_at.strftime("%Y/%m/%d") if deliv_at else "—",
                "delivered_by": srv_name or "—",
                "phone": mem.phone or "—",
                "whatsapp_phone": getattr(mem, "whatsapp_phone", None) or mem.phone or ""
            })

        # Sort chronologically by birthday month and day
        results.sort(key=lambda x: (x.get("birthday_month", 0), x.get("birthday_day", 0), x.get("full_name", "")))
        for i, item in enumerate(results, 1):
            item["index"] = i

        return results

    async def get_dashboard_stats(self, allowed_class_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        محرك المؤشرات الحية الشامل للداشبورد (Unified Live Dashboard Motor):
        يجمع كافة الإحصائيات والأرقام الحية بكفاءة عالية في استعلام موحد وسريع.
        """
        from app.models.user import User
        from app.models.class_group import ClassGroup, ClassGroupMember, ClassGroupServant
        from app.models.rewards import PointsTransaction
        from datetime import date, timedelta, datetime

        today = date.today()

        # 1. Base Counts
        mem_q = select(func.count()).select_from(Member).where(
            or_(Member.status.ilike("active"), Member.status == "Active", Member.status == "نشط", Member.status == None),
            or_(Member.is_archived == False, Member.is_archived == None)
        )
        cls_q = select(func.count()).select_from(ClassGroup).where(
            or_(ClassGroup.status.ilike("active"), ClassGroup.status == "Active", ClassGroup.status == None)
        )
        srv_q = select(func.count()).select_from(User).where(or_(User.is_active == True, User.is_active == None))
        ses_q = select(func.count()).select_from(AttendanceSession).where(
            or_(AttendanceSession.status != "Cancelled", AttendanceSession.status == None)
        )
        open_ses_q = select(func.count()).select_from(AttendanceSession).where(
            or_(AttendanceSession.status == "Open", AttendanceSession.status == "Scheduled")
        )
        pending_fol_q = select(func.count()).select_from(FollowupTask).where(FollowupTask.status == "Pending")
        escalated_fol_q = select(func.count()).select_from(FollowupTask).where(FollowupTask.status.in_(["Escalated", "Urgent"]))
        pts_q = select(func.coalesce(func.sum(Member.total_points), 0)).select_from(Member)

        if allowed_class_ids and len(allowed_class_ids) > 0:
            clean_allowed = [c.strip().upper() for c in allowed_class_ids if c and c.strip()]
            if clean_allowed:
                mem_q = mem_q.where(exists(
                    select(1).select_from(ClassGroupMember).where(
                        func.upper(func.trim(ClassGroupMember.member_id)) == func.upper(func.trim(Member.member_id)),
                        func.upper(func.trim(ClassGroupMember.class_id)).in_(clean_allowed),
                        ClassGroupMember.is_active == True
                    )
                ))
                cls_q = cls_q.where(func.upper(ClassGroup.class_id).in_(clean_allowed))
                ses_q = ses_q.where(func.upper(AttendanceSession.class_id).in_(clean_allowed))
                open_ses_q = open_ses_q.where(func.upper(AttendanceSession.class_id).in_(clean_allowed))

        total_members = (await self.db.execute(mem_q)).scalar_one() or 0
        total_classes = (await self.db.execute(cls_q)).scalar_one() or 0
        total_servants = (await self.db.execute(srv_q)).scalar_one() or 0
        total_sessions = (await self.db.execute(ses_q)).scalar_one() or 0
        active_sessions = (await self.db.execute(open_ses_q)).scalar_one() or 0
        pending_followups = (await self.db.execute(pending_fol_q)).scalar_one() or 0
        escalated_followups = (await self.db.execute(escalated_fol_q)).scalar_one() or 0
        total_points = (await self.db.execute(pts_q)).scalar_one() or 0

        # 2. Stage Breakdown
        stages_breakdown = []
        canonical_list = ["حضانة", "ابتدائي", "إعدادي", "ثانوي", "جامعيين وخريجين"]
        for stg in canonical_list:
            if stg == "جامعيين وخريجين":
                cond = or_(
                    Member.stage.ilike("%جامع%"),
                    Member.stage.ilike("%خريج%"),
                    Member.stage == "جامعيين وخريجين"
                )
            else:
                cond = Member.stage.ilike(f"%{stg}%")

            stg_q = select(func.count()).select_from(Member).where(
                or_(Member.is_archived == False, Member.is_archived == None),
                or_(Member.status.ilike("active"), Member.status == "Active", Member.status == "نشط", Member.status == None),
                cond
            )
            count = (await self.db.execute(stg_q)).scalar_one() or 0
            pct = round((count / total_members * 100), 1) if total_members > 0 else 0
            stages_breakdown.append({
                "stage": stg,
                "count": count,
                "percentage": pct
            })

        # 3. Recent Attendance Sessions
        rec_ses_q = (
            select(AttendanceSession, ClassGroup.name.label("class_name"))
            .outerjoin(ClassGroup, AttendanceSession.class_id == ClassGroup.class_id)
            .where(or_(AttendanceSession.status != "Cancelled", AttendanceSession.status == None))
        )
        if allowed_class_ids and len(allowed_class_ids) > 0:
            rec_ses_q = rec_ses_q.where(func.upper(AttendanceSession.class_id).in_([c.strip().upper() for c in allowed_class_ids if c and c.strip()]))
        rec_ses_q = rec_ses_q.order_by(AttendanceSession.session_date.desc(), AttendanceSession.created_at.desc()).limit(6)
        ses_rows = (await self.db.execute(rec_ses_q)).all()

        recent_sessions_data = []
        recent_rates = []
        for s, c_name in ses_rows:
            att_cnt = (await self.db.execute(
                select(func.count()).select_from(AttendanceRecord).where(
                    AttendanceRecord.session_id == s.session_id, AttendanceRecord.status == "Valid"
                )
            )).scalar_one() or 0

            # Target members
            if s.class_id:
                tgt_cnt = (await self.db.execute(
                    select(func.count()).select_from(ClassGroupMember).where(
                        ClassGroupMember.class_id == s.class_id, ClassGroupMember.is_active == True
                    )
                )).scalar_one() or 0
                if tgt_cnt == 0:
                    tgt_cnt = att_cnt
            else:
                tgt_cnt = total_members or att_cnt

            abs_cnt = max(0, tgt_cnt - att_cnt)
            rate = round((att_cnt / tgt_cnt * 100), 1) if tgt_cnt > 0 else (100.0 if att_cnt > 0 else 0.0)
            if tgt_cnt > 0:
                recent_rates.append(rate)
            recent_sessions_data.append({
                "session_id": s.session_id,
                "title": s.title,
                "session_date": s.session_date.strftime("%Y/%m/%d") if s.session_date else "",
                "status": s.status,
                "class_name": c_name or s.stage or "عام",
                "attended_count": att_cnt,
                "absent_count": abs_cnt,
                "attendance_rate": rate
            })

        avg_attendance_rate = round(sum(recent_rates) / len(recent_rates), 1) if recent_rates else 0.0

        # 4. Urgent Followup Cases (absent 2+ times)
        urgent_cases = []
        try:
            urgent_q = (
                select(FollowupTask, Member.full_name, Member.phone, User.full_name.label("servant_name"))
                .join(Member, FollowupTask.member_id == Member.member_id)
                .outerjoin(User, FollowupTask.assigned_servant_id == User.user_id)
                .where(FollowupTask.status.in_(["Pending", "Escalated"]), FollowupTask.consecutive_weeks >= 2)
                .order_by(FollowupTask.consecutive_weeks.desc())
                .limit(5)
            )
            urgent_rows = (await self.db.execute(urgent_q)).all()
            urgent_cases = [{
                "task_id": t.task_id,
                "member_id": t.member_id,
                "member_name": m_name,
                "phone": m_phone,
                "consecutive_weeks": t.consecutive_weeks,
                "assigned_servant": srv_name or "أمين الفصل"
            } for t, m_name, m_phone, srv_name in urgent_rows]
        except Exception:
            pass

        # 5. Upcoming Birthdays (Next 14 days)
        upcoming_bdays = []
        try:
            bday_rows = (await self.db.execute(
                select(Member.member_id, Member.full_name, Member.date_of_birth, Member.phone, Member.stage)
                .where(or_(Member.is_archived == False, Member.is_archived == None), Member.date_of_birth != None)
            )).all()

            for mid, fn, dob, ph, stg in bday_rows:
                if not dob:
                    continue
                if isinstance(dob, str):
                    try:
                        dob = datetime.strptime(dob[:10], "%Y-%m-%d").date()
                    except Exception:
                        continue
                elif isinstance(dob, datetime):
                    dob = dob.date()

                try:
                    b_this_year = date(today.year, dob.month, dob.day)
                except ValueError:
                    b_this_year = date(today.year, 3, 1)

                if b_this_year < today:
                    try:
                        b_next = date(today.year + 1, dob.month, dob.day)
                    except ValueError:
                        b_next = date(today.year + 1, 3, 1)
                else:
                    b_next = b_this_year

                days_diff = (b_next - today).days
                if 0 <= days_diff <= 14:
                    upcoming_bdays.append({
                        "member_id": mid,
                        "full_name": fn,
                        "days_remaining": days_diff,
                        "phone": ph,
                        "stage": stg,
                        "birthday_str": f"{dob.day:02d}/{dob.month:02d}"
                    })
            upcoming_bdays.sort(key=lambda x: x["days_remaining"])
        except Exception:
            pass

        # 6. Active Classes with Lead Servants
        top_classes = []
        try:
            c_query = (
                select(
                    ClassGroup.class_id,
                    ClassGroup.name,
                    ClassGroup.stage,
                    ClassGroup.group_type,
                    func.count(func.distinct(ClassGroupMember.membership_id)).label("members_count"),
                    func.count(func.distinct(ClassGroupServant.assignment_id)).label("servants_count")
                )
                .outerjoin(ClassGroupMember, and_(ClassGroupMember.class_id == ClassGroup.class_id, ClassGroupMember.is_active == True))
                .outerjoin(ClassGroupServant, and_(ClassGroupServant.class_id == ClassGroup.class_id, ClassGroupServant.is_active == True))
                .where(or_(ClassGroup.status.ilike("active"), ClassGroup.status == "Active", ClassGroup.status == None))
            )
            if allowed_class_ids and len(allowed_class_ids) > 0:
                c_query = c_query.where(func.upper(ClassGroup.class_id).in_([c.strip().upper() for c in allowed_class_ids if c and c.strip()]))
            c_query = (
                c_query
                .group_by(ClassGroup.class_id, ClassGroup.name, ClassGroup.stage, ClassGroup.group_type)
                .order_by(func.count(func.distinct(ClassGroupMember.membership_id)).desc())
                .limit(8)
            )
            c_res = (await self.db.execute(c_query)).all()

            for cid, cname, cstage, cgtype, m_cnt, s_cnt in c_res:
                ls_q = (
                    select(User.full_name)
                    .join(ClassGroupServant, User.user_id == ClassGroupServant.servant_id)
                    .where(
                        ClassGroupServant.class_id == cid,
                        ClassGroupServant.role.ilike("%lead%"),
                        ClassGroupServant.is_active == True
                    )
                    .limit(1)
                )
                lead_name = (await self.db.execute(ls_q)).scalars().first()
                top_classes.append({
                    "class_id": cid,
                    "name": cname,
                    "stage": cstage,
                    "group_type": cgtype,
                    "members_count": m_cnt,
                    "servants_count": s_cnt,
                    "lead_servant": lead_name or "لم يُحدد"
                })
        except Exception:
            pass

        return {
            "kpis": {
                "total_members": total_members,
                "total_classes": total_classes,
                "total_servants": total_servants,
                "total_sessions": total_sessions,
                "active_sessions": active_sessions,
                "pending_followups": pending_followups,
                "escalated_followups": escalated_followups,
                "total_points": total_points,
                "recent_attendance_rate": avg_attendance_rate,
                "upcoming_birthdays_count": len(upcoming_bdays)
            },
            "stages_breakdown": stages_breakdown,
            "recent_sessions": recent_sessions_data,
            "urgent_cases": urgent_cases,
            "upcoming_birthdays": upcoming_bdays[:6],
            "top_classes": top_classes
        }


