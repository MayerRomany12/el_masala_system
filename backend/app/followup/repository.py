import secrets
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, date, timezone

from sqlalchemy import select, update, func, or_, String, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.followup import FollowupTask, FollowupLog
from app.models.member import Member
from app.models.user import User
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.core.errors import AppException


def _parse_date(d: Any) -> Optional[date]:
    if not d:
        return None
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        return datetime.strptime(d.strip(), "%Y-%m-%d").date()
    raise ValueError(f"Invalid date format: {d}")


class FollowupRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_task_by_id(self, task_id: str) -> Optional[Dict[str, Any]]:
        query = (
            select(
                FollowupTask,
                Member,
                User.full_name.label("servant_name")
            )
            .join(Member, FollowupTask.member_id == Member.member_id)
            .outerjoin(User, FollowupTask.assigned_servant_id == User.user_id)
            .where(FollowupTask.task_id == task_id)
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            return None

        task, mem, servant_name = row
        logs = await self.get_task_logs(task_id)

        return {
            "task_id": task.task_id,
            "member_id": task.member_id,
            "member_name": mem.full_name,
            "member_stage": mem.stage,
            "member_phone": mem.phone,
            "member_whatsapp": getattr(mem, "whatsapp_phone", None) or mem.phone,
            "member_secondary_phone": getattr(mem, "secondary_phone", None),
            "member_child_phone": getattr(mem, "member_phone", None),
            "member_email": getattr(mem, "email", None),
            "member_area": getattr(mem, "area", None) or "غير محدد",
            "member_location_url": getattr(mem, "location_url", None),
            "member_address": getattr(mem, "address", None),
            "last_absence_session_id": task.last_absence_session_id,
            "consecutive_weeks": task.consecutive_weeks,
            "assigned_servant_id": task.assigned_servant_id,
            "assigned_servant_name": servant_name,
            "status": task.status,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if isinstance(task.due_date, (date, datetime)) else str(task.due_date) if task.due_date else None,
            "last_detected_at": task.last_detected_at,
            "created_at": task.created_at,
            "recent_logs": logs
        }

    async def get_active_task_by_member(self, member_id: str) -> Optional[Dict[str, Any]]:
        query = select(FollowupTask).where(
            FollowupTask.member_id == member_id,
            FollowupTask.status.in_(["Pending", "Escalated"])
        )
        res = await self.db.execute(query)
        task = res.scalar_one_or_none()
        if not task:
            return None
        return await self.get_task_by_id(task.task_id)

    async def upsert_followup_task(
        self,
        member_id: str,
        consecutive_weeks: int,
        last_absence_session_id: Optional[str] = None,
        priority: str = "Normal",
        assigned_servant_id: Optional[str] = None
    ) -> Tuple[Dict[str, Any], bool]:
        """
        قاعدة منع التكرار المحكمة (Deduplication / Upsert Rule):
        إذا كان للطفل مهمة نشطة حية، نُحدّث البيانات الحالية فقط دون إنشاء مهمة مكررة.
        """
        existing = await self.get_active_task_by_member(member_id)
        now = datetime.now(timezone.utc)

        if existing:
            # Update existing active task
            new_status = "Escalated" if (priority == "Urgent" or consecutive_weeks >= 4) else existing["status"]
            update_data = {
                "consecutive_weeks": max(existing["consecutive_weeks"], consecutive_weeks),
                "last_absence_session_id": last_absence_session_id or existing["last_absence_session_id"],
                "priority": priority,
                "status": new_status,
                "last_detected_at": now,
                "updated_at": now
            }
            if assigned_servant_id:
                update_data["assigned_servant_id"] = assigned_servant_id

            await self.db.execute(
                update(FollowupTask)
                .where(FollowupTask.task_id == existing["task_id"])
                .values(**update_data)
            )
            await self.db.flush()
            updated_task = await self.get_task_by_id(existing["task_id"])
            return updated_task, False # is_new = False

        # Create new Task (FLW-XXXXXX)
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"FLW-{rand_num:06d}"

            new_task = FollowupTask(
                task_id=candidate_id,
                member_id=member_id,
                last_absence_session_id=last_absence_session_id,
                consecutive_weeks=consecutive_weeks,
                assigned_servant_id=assigned_servant_id,
                status="Escalated" if priority == "Urgent" or consecutive_weeks >= 4 else "Pending",
                priority=priority,
                last_detected_at=now
            )
            self.db.add(new_task)
            try:
                await self.db.flush()
                await self.db.refresh(new_task)
                created_task = await self.get_task_by_id(candidate_id)
                return created_task, True # is_new = True
            except IntegrityError:
                await self.db.rollback()
                continue

        raise AppException(message="تعذر إنشاء مهمة افتقاد جديدة")

    async def calculate_consecutive_absences_for_member(
        self,
        member_id: str,
        member_stage: str,
        class_id: Optional[str] = None
    ) -> Tuple[int, Optional[str]]:
        """
        حساب الغياب المتتالي بناءً على جلسات فصل المخدوم الأساسية.
        """
        from app.models.class_group import ClassGroupMember
        if not class_id:
            c_res = await self.db.execute(
                select(ClassGroupMember.class_id).where(
                    ClassGroupMember.member_id == member_id,
                    ClassGroupMember.is_active == True
                )
            )
            c_row = c_res.first()
            if c_row:
                class_id = c_row[0]

        query = select(AttendanceSession).order_by(AttendanceSession.session_date.desc(), AttendanceSession.created_at.desc())
        if class_id:
            query = query.where(AttendanceSession.class_id == class_id)
        elif member_stage:
            stage_prefix = member_stage.split('-')[0].strip()
            query = query.where(or_(AttendanceSession.stage == "ALL", AttendanceSession.stage.ilike(f"%{stage_prefix}%")))

        sessions = (await self.db.execute(query.limit(20))).scalars().all()
        if not sessions:
            return 0, None

        consecutive = 0
        last_absence_session_id = None

        for s in sessions:
            rec_q = select(AttendanceRecord).where(
                AttendanceRecord.session_id == s.session_id,
                AttendanceRecord.member_id == member_id,
                AttendanceRecord.status == "Valid"
            )
            rec = (await self.db.execute(rec_q)).scalar_one_or_none()
            if rec:
                # Member attended this session -> Break consecutive absence streak
                break
            else:
                consecutive += 1
                if not last_absence_session_id:
                    last_absence_session_id = s.session_id

        return consecutive, last_absence_session_id

    async def run_absence_detector(self, stage: Optional[str] = None, class_id: Optional[str] = None) -> Dict[str, Any]:
        """
        محرك الكشف التلقائي عن الغائبين وتحديث مهام الافتقاد بحسب الفصل أو المرحلة
        """
        from app.settings.repository import SettingsRepository
        from app.models.class_group import ClassGroupMember
        settings_repo = SettingsRepository(self.db)
        threshold_str = await settings_repo.get_setting_value("absence_threshold_weeks", "2")
        threshold = int(threshold_str)

        mem_query = select(Member).where(Member.status == "Active", Member.is_archived == False)
        if class_id:
            mem_query = mem_query.join(ClassGroupMember, Member.member_id == ClassGroupMember.member_id).where(
                ClassGroupMember.class_id == class_id,
                ClassGroupMember.is_active == True
            )
        elif stage and stage != "ALL":
            stage_prefix = stage.split('-')[0].strip()
            mem_query = mem_query.where(Member.stage.ilike(f"%{stage_prefix}%"))

        members = (await self.db.execute(mem_query)).scalars().all()

        detected_count = 0
        tasks_created = 0
        tasks_updated = 0

        for m in members:
            consecutive, last_session_id = await self.calculate_consecutive_absences_for_member(m.member_id, m.stage, class_id=class_id)

            # Dynamic Threshold Rule from SystemSettings
            if consecutive >= threshold:
                detected_count += 1
                priority = "Normal"
                if consecutive == 3:
                    priority = "High"
                elif consecutive >= 4:
                    priority = "Urgent"

                task, is_new = await self.upsert_followup_task(
                    member_id=m.member_id,
                    consecutive_weeks=consecutive,
                    last_absence_session_id=last_session_id,
                    priority=priority
                )
                if is_new:
                    tasks_created += 1
                else:
                    tasks_updated += 1

        return {
            "detected_count": detected_count,
            "tasks_created": tasks_created,
            "tasks_updated": tasks_updated,
            "message": f"تم كشف {detected_count} طفل غائب لـ 2+ جلسات متتالية (تم إنشاء {tasks_created} جديدة وتحديث {tasks_updated} قائمة)."
        }

    # ─── Logs & Tasks Queries ──────────────────────────────────────────────────

    async def create_followup_log(
        self,
        task_id: str,
        servant_id: str,
        contact_method: str,
        outcome: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"LOG-{rand_num:06d}"

            log = FollowupLog(
                log_id=candidate_id,
                task_id=task_id,
                servant_id=servant_id,
                contact_method=contact_method,
                outcome=outcome,
                notes=notes
            )
            self.db.add(log)
            try:
                await self.db.flush()
                await self.db.refresh(log)

                # Rules for Task Completion:
                # Promised -> Completed
                # Sick / Traveling / Family_Reason / No_Response -> Remains Active Pending
                if outcome == "Promised":
                    await self.db.execute(
                        update(FollowupTask)
                        .where(FollowupTask.task_id == task_id)
                        .values(status="Completed", updated_at=datetime.now(timezone.utc))
                    )
                    await self.db.flush()

                return await self.get_task_by_id(task_id)
            except IntegrityError:
                await self.db.rollback()
                continue

        raise AppException(message="تعذر توثيق سجل الافتقاد")

    async def get_task_logs(self, task_id: str) -> List[Dict[str, Any]]:
        query = (
            select(FollowupLog, User.full_name.label("servant_name"))
            .outerjoin(User, FollowupLog.servant_id == User.user_id)
            .where(FollowupLog.task_id == task_id)
            .order_by(FollowupLog.logged_at.desc())
        )
        res = await self.db.execute(query)
        rows = res.all()

        return [{
            "log_id": l.log_id,
            "task_id": l.task_id,
            "servant_id": l.servant_id,
            "servant_name": s_name,
            "contact_method": l.contact_method,
            "outcome": l.outcome,
            "notes": l.notes,
            "logged_at": l.logged_at
        } for l, s_name in rows]

    async def get_tasks(
        self,
        servant_id: Optional[str] = None,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        class_id: Optional[str] = None,
        area: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        from app.models.class_group import ClassGroupMember
        query = select(FollowupTask).join(Member, FollowupTask.member_id == Member.member_id)

        if class_id:
            query = query.where(
                exists(
                    select(1).select_from(ClassGroupMember).where(
                        ClassGroupMember.member_id == Member.member_id,
                        ClassGroupMember.class_id == class_id,
                        ClassGroupMember.is_active == True
                    )
                )
            )
        elif allowed_class_ids is not None:
            query = query.where(
                exists(
                    select(1).select_from(ClassGroupMember).where(
                        ClassGroupMember.member_id == Member.member_id,
                        ClassGroupMember.class_id.in_(allowed_class_ids),
                        ClassGroupMember.is_active == True
                    )
                )
            )

        if area:
            query = query.where(Member.area == area)
        if status:
            query = query.where(FollowupTask.status == status)
        if priority:
            query = query.where(FollowupTask.priority == priority)
        if servant_id:
            query = query.where(FollowupTask.assigned_servant_id == servant_id)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Member.full_name.ilike(pattern),
                    Member.phone.ilike(pattern),
                    Member.member_id.ilike(pattern),
                    Member.area.ilike(pattern),
                    FollowupTask.task_id.ilike(pattern)
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        query = query.order_by(FollowupTask.consecutive_weeks.desc(), FollowupTask.updated_at.desc()).offset(skip).limit(limit)
        task_rows = (await self.db.execute(query)).scalars().all()

        items = []
        for t in task_rows:
            full_t = await self.get_task_by_id(t.task_id)
            if full_t:
                items.append(full_t)

        return items, total

    async def get_tasks_grouped_by_area(
        self,
        class_id: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        تجميع مهام الافتقاد بحسب المناطق السكنية لتسهيل توزيع ومتابعة الافتقاد الميداني
        """
        items, _ = await self.get_tasks(
            class_id=class_id,
            allowed_class_ids=allowed_class_ids,
            status=status,
            limit=500
        )
        areas_dict = {}
        for t in items:
            area_name = t.get("member_area") or "غير محدد"
            if area_name not in areas_dict:
                areas_dict[area_name] = []
            areas_dict[area_name].append(t)

        area_summary = [
            {"area": a, "count": len(tasks), "tasks": tasks}
            for a, tasks in sorted(areas_dict.items(), key=lambda x: len(x[1]), reverse=True)
        ]
        return {
            "total_tasks": len(items),
            "total_areas": len(area_summary),
            "areas": area_summary
        }

    async def update_task(self, task_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if "due_date" in update_data and update_data["due_date"]:
            update_data["due_date"] = _parse_date(update_data["due_date"])

        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(FollowupTask).where(FollowupTask.task_id == task_id).values(**update_data)
        )
        await self.db.flush()
        return await self.get_task_by_id(task_id)

    async def distribute_class_tasks(self, class_id: str) -> Dict[str, Any]:
        """
        توزيع مهام الافتقاد الخاصة بأعضاء الفصل بالتساوي على الخدام النشطين المسكنين فيه (Round-Robin)
        مع استبعاد السوبر أدمن تلقائياً (السوبر أدمن يتابع فقط ولا يفتقد).
        """
        from app.models.class_group import ClassGroupServant, ClassGroupMember, ClassGroup
        from app.models.user import User

        # Fetch class info
        c_res = await self.db.execute(select(ClassGroup.name).where(ClassGroup.class_id == class_id))
        class_name = c_res.scalar_one_or_none() or class_id

        # 1. Fetch active servants in this class (EXCLUDING SUPER ADMIN)
        s_query = (
            select(User.user_id, User.full_name)
            .join(ClassGroupServant, User.user_id == ClassGroupServant.servant_id)
            .where(
                ClassGroupServant.class_id == class_id,
                ClassGroupServant.is_active == True,
                User.is_active == True,
                ~User.role.in_(["SuperAdmin", "Super Admin"])
            )
            .order_by(User.full_name)
        )
        servants = (await self.db.execute(s_query)).all()
        if not servants:
            raise AppException(f"لا يوجد خدام (غير السوبر أدمن) مسجلون بنشاط في فصل '{class_name}' لتوزيع المهام عليهم")

        # 2. Fetch active members of this class
        m_query = select(ClassGroupMember.member_id).where(
            ClassGroupMember.class_id == class_id,
            ClassGroupMember.is_active == True
        )
        class_member_ids = (await self.db.execute(m_query)).scalars().all()
        if not class_member_ids:
            return {"distributed_count": 0, "message": "لا يوجد مخدومين في هذا الفصل", "per_servant": []}

        # 3. Fetch pending/unassigned or pending tasks for these members
        t_query = select(FollowupTask).where(
            FollowupTask.member_id.in_(class_member_ids),
            FollowupTask.status.in_(["Pending", "Escalated"])
        ).order_by(FollowupTask.consecutive_weeks.desc())

        tasks = (await self.db.execute(t_query)).scalars().all()
        if not tasks:
            return {"distributed_count": 0, "message": "لا توجد مهام افتقاد معلقة لهذا الفصل", "per_servant": []}

        per_servant_counts = {s[0]: {"servant_id": s[0], "servant_name": s[1], "count": 0} for s in servants}
        for idx, task in enumerate(tasks):
            assigned_servant = servants[idx % len(servants)]
            task.assigned_servant_id = assigned_servant[0]
            task.updated_at = datetime.now(timezone.utc)
            per_servant_counts[assigned_servant[0]]["count"] += 1

        await self.db.commit()

        return {
            "class_id": class_id,
            "class_name": class_name,
            "total_tasks": len(tasks),
            "servants_count": len(servants),
            "distribution": list(per_servant_counts.values())
        }

    async def detect_and_distribute_class(self, class_id: str) -> Dict[str, Any]:
        """
        كشف الغياب لفصل محدد ثم توزيعه تلقائياً بالتساوي على خدام الفصل
        """
        detect_res = await self.run_absence_detector(class_id=class_id)
        dist_res = await self.distribute_class_tasks(class_id=class_id)
        return {
            "class_id": class_id,
            "detected_count": detect_res.get("detected_count", 0),
            "tasks_created": detect_res.get("tasks_created", 0),
            "tasks_updated": detect_res.get("tasks_updated", 0),
            "total_tasks": dist_res.get("total_tasks", 0),
            "servants_count": dist_res.get("servants_count", 0),
            "distribution": dist_res.get("distribution", []),
            "message": f"تم كشف وتوزيع {dist_res.get('total_tasks', 0)} مهمة افتقاد بالتساوي على {dist_res.get('servants_count', 0)} من خدام الفصل."
        }

    async def get_class_followup_stats(self, class_id: str) -> Dict[str, Any]:
        """
        لوحة متابعة المشرف: إحصائيات افتقاد الفصل ومتابعة إنجاز كل خادم لمهامه
        """
        from app.models.class_group import ClassGroupServant, ClassGroupMember, ClassGroup
        from app.models.user import User

        # Class Info
        c_row = (await self.db.execute(select(ClassGroup).where(ClassGroup.class_id == class_id))).scalar_one_or_none()
        class_name = c_row.name if c_row else "الفصل"

        # Servants in class
        s_query = (
            select(User.user_id, User.full_name, User.phone, ClassGroupServant.role)
            .join(ClassGroupServant, User.user_id == ClassGroupServant.servant_id)
            .where(
                ClassGroupServant.class_id == class_id,
                ClassGroupServant.is_active == True,
                User.is_active == True
            )
            .order_by(ClassGroupServant.role.desc(), User.full_name)
        )
        servants = (await self.db.execute(s_query)).all()

        # Members in class
        m_query = select(ClassGroupMember.member_id).where(
            ClassGroupMember.class_id == class_id,
            ClassGroupMember.is_active == True
        )
        class_member_ids = (await self.db.execute(m_query)).scalars().all()

        if not class_member_ids:
            return {
                "class_id": class_id,
                "class_name": class_name,
                "total_members": 0,
                "total_tasks": 0,
                "pending_tasks": 0,
                "completed_tasks": 0,
                "servants_progress": []
            }

        # Tasks for class members
        t_query = select(FollowupTask).where(FollowupTask.member_id.in_(class_member_ids))
        all_tasks = (await self.db.execute(t_query)).scalars().all()

        total_tasks = len(all_tasks)
        pending_count = sum(1 for t in all_tasks if t.status in ["Pending", "Escalated"])
        completed_count = sum(1 for t in all_tasks if t.status == "Completed")

        # Group by servant
        servants_progress = []
        for s_id, s_name, s_phone, s_role in servants:
            servant_tasks = [t for t in all_tasks if t.assigned_servant_id == s_id]
            s_pending = sum(1 for t in servant_tasks if t.status in ["Pending", "Escalated"])
            s_completed = sum(1 for t in servant_tasks if t.status == "Completed")
            rate = round((s_completed / len(servant_tasks) * 100), 1) if servant_tasks else 100.0

            servants_progress.append({
                "servant_id": s_id,
                "servant_name": s_name,
                "phone": s_phone,
                "role": s_role,
                "total_tasks": len(servant_tasks),
                "pending_tasks": s_pending,
                "completed_tasks": s_completed,
                "completion_rate": rate
            })

        # Unassigned tasks
        unassigned = [t for t in all_tasks if not t.assigned_servant_id and t.status in ["Pending", "Escalated"]]

        return {
            "class_id": class_id,
            "class_name": class_name,
            "total_members": len(class_member_ids),
            "total_tasks": total_tasks,
            "pending_tasks": pending_count,
            "completed_tasks": completed_count,
            "unassigned_pending_count": len(unassigned),
            "servants_progress": servants_progress
        }

