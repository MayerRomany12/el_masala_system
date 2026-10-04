import secrets
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timezone

from sqlalchemy import select, update, func, or_, String, exists
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.member import Member
from app.models.class_group import ClassGroup, ClassGroupMember
from app.core.errors import AppException


def _row_to_dict(row: Member) -> Dict[str, Any]:
    return {
        "member_id": row.member_id,
        "full_name": row.full_name,
        "gender": row.gender,
        "date_of_birth": row.date_of_birth,
        "stage": row.stage,
        "group_name": row.group_name,
        "phone": row.phone,
        "secondary_phone": row.secondary_phone,
        "member_phone": row.member_phone,
        "whatsapp_phone": row.whatsapp_phone,
        "email": getattr(row, "email", None),
        "area": getattr(row, "area", None),
        "father_of_confession": row.father_of_confession,
        "address": row.address,
        "notes": row.notes,
        "status": row.status,
        "photo_url": row.photo_url,
        "is_archived": row.is_archived,
        "archived_at": row.archived_at,
        "archived_by": row.archived_by,
        "qr_token": row.qr_token,
        "card_issued_at": row.card_issued_at,
        "total_points": row.total_points,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "active_classes": []
    }


class MemberRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        توليد K-XXXXXX عشوائياً بأمان مع الاعتماد على UNIQUE INDEX في PostgreSQL
        كضمان نهائي ضد التضارب في الطلبات المتزامنة.
        """
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"K-{rand_num:06d}"

            new_member = Member(
                member_id=candidate_id,
                **member_data
            )
            self.db.add(new_member)
            try:
                await self.db.flush()       # Trigger DB constraint check
                await self.db.refresh(new_member)
                return _row_to_dict(new_member)
            except IntegrityError:
                await self.db.rollback()    # Rollback & retry on K-XXXXXX collision
                continue

        raise AppException(message="تعذر توليد رمز عضوية فريد، يرجى إعادة المحاولة")

    async def get_by_member_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        clean_id = member_id.strip().upper()
        result = await self.db.execute(
            select(Member).where(func.upper(Member.member_id) == clean_id)
        )
        row = result.scalar_one_or_none()
        if not row:
            return None

        member_dict = _row_to_dict(row)
        # Fetch active classes with deterministic ordering
        cgm_query = (
            select(
                ClassGroupMember.class_id,
                ClassGroup.name.label("class_name"),
                ClassGroup.group_type,
                ClassGroup.stage,
                ClassGroupMember.joined_at
            )
            .join(ClassGroup, ClassGroupMember.class_id == ClassGroup.class_id)
            .where(
                ClassGroupMember.member_id == clean_id,
                ClassGroupMember.is_active == True
            )
            .order_by(ClassGroup.group_type.asc(), ClassGroupMember.joined_at.asc(), ClassGroup.name.asc())
        )
        cgm_res = await self.db.execute(cgm_query)
        member_dict["active_classes"] = [
            {
                "class_id": r.class_id,
                "class_name": r.class_name,
                "group_type": r.group_type,
                "stage": r.stage,
                "joined_at": r.joined_at.isoformat() if r.joined_at else None
            }
            for r in cgm_res.all()
        ]
        return member_dict

    async def get_members(
        self,
        search: Optional[str] = None,
        stage: Optional[str] = None,
        class_id: Optional[str] = None,
        area: Optional[str] = None,
        status: Optional[str] = None,
        allowed_class_ids: Optional[List[str]] = None,
        include_archived: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = select(Member)

        if status:
            if status == "Archived":
                query = query.where(Member.is_archived == True)
            else:
                query = query.where(Member.status == status, Member.is_archived == False)
        elif not include_archived:
            query = query.where(Member.is_archived == False)

        if stage:
            query = query.where(Member.stage == stage)

        if area:
            query = query.where(Member.area == area)

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
            # Servant / scoped admin: only see members belonging to assigned classes
            query = query.where(
                exists(
                    select(1).select_from(ClassGroupMember).where(
                        ClassGroupMember.member_id == Member.member_id,
                        ClassGroupMember.class_id.in_(allowed_class_ids),
                        ClassGroupMember.is_active == True
                    )
                )
            )

        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Member.full_name.ilike(pattern),
                    Member.phone.ilike(pattern),
                    Member.member_id.ilike(pattern),
                    Member.group_name.ilike(pattern),
                    Member.area.ilike(pattern),
                    Member.email.ilike(pattern),
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_q)
        total = total_result.scalar_one()

        query = query.order_by(Member.created_at.desc()).offset(skip).limit(limit)
        items_result = await self.db.execute(query)
        items = [_row_to_dict(r) for r in items_result.scalars().all()]

        # Batch load active classes for all retrieved members with deterministic ordering
        if items:
            member_ids = [item["member_id"] for item in items]
            cgm_query = (
                select(
                    ClassGroupMember.member_id,
                    ClassGroupMember.class_id,
                    ClassGroup.name.label("class_name"),
                    ClassGroup.group_type,
                    ClassGroup.stage,
                    ClassGroupMember.joined_at
                )
                .join(ClassGroup, ClassGroupMember.class_id == ClassGroup.class_id)
                .where(
                    ClassGroupMember.member_id.in_(member_ids),
                    ClassGroupMember.is_active == True
                )
                .order_by(ClassGroup.group_type.asc(), ClassGroupMember.joined_at.asc(), ClassGroup.name.asc())
            )
            cgm_res = await self.db.execute(cgm_query)
            classes_by_member = {mid: [] for mid in member_ids}
            for r in cgm_res.all():
                classes_by_member[r.member_id].append({
                    "class_id": r.class_id,
                    "class_name": r.class_name,
                    "group_type": r.group_type,
                    "stage": r.stage,
                    "joined_at": r.joined_at.isoformat() if r.joined_at else None
                })
            for item in items:
                item["active_classes"] = classes_by_member.get(item["member_id"], [])

        return items, total


    async def update_member(self, member_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(Member).where(Member.member_id == member_id).values(**update_data)
        )
        await self.db.flush()
        return await self.get_by_member_id(member_id)

    async def update_status(self, member_id: str, status: str) -> Optional[Dict[str, Any]]:
        await self.db.execute(
            update(Member)
            .where(Member.member_id == member_id)
            .values(status=status, updated_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
        return await self.get_by_member_id(member_id)

    async def archive_member(self, member_id: str, is_archived: bool, archived_by: Optional[str] = None) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc) if is_archived else None
        await self.db.execute(
            update(Member)
            .where(Member.member_id == member_id)
            .values(
                is_archived=is_archived,
                archived_at=now,
                archived_by=archived_by if is_archived else None,
                updated_at=datetime.now(timezone.utc)
            )
        )
        await self.db.flush()
        return await self.get_by_member_id(member_id)


    async def get_by_qr_token(self, token: str) -> Optional[Dict[str, Any]]:
        """البحث عن مخدوم بواسطة الـ QR Token الأولي — يُستخدم في عملية المسح."""
        result = await self.db.execute(
            select(Member).where(Member.qr_token == token)
        )
        row = result.scalar_one_or_none()
        return _row_to_dict(row) if row else None

    async def set_qr_token(self, member_id: str, token: str) -> Dict[str, Any]:
        """حفظ الـ QR Token عند إصدار البطاقة لأول مرة."""
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(Member)
            .where(Member.member_id == member_id)
            .values(qr_token=token, card_issued_at=now, updated_at=now)
        )
        await self.db.flush()
        return await self.get_by_member_id(member_id)

    async def get_stats(self) -> Dict[str, Any]:
        total = (await self.db.execute(select(func.count()).select_from(Member))).scalar_one()
        active = (await self.db.execute(
            select(func.count()).select_from(Member).where(Member.status == "Active")
        )).scalar_one()
        inactive = total - active
        distinct_stages = (await self.db.execute(
            select(Member.stage).distinct()
        )).scalars().all()

        distinct_areas = (await self.db.execute(
            select(Member.area).where(Member.area != None, Member.area != "").distinct()
        )).scalars().all()

        return {
            "total_members": total,
            "active_members": active,
            "inactive_members": inactive,
            "stages_count": len(distinct_stages),
            "stages_list": list(distinct_stages),
            "areas_list": [a for a in distinct_areas if a]
        }

    async def get_distinct_areas(self) -> List[str]:
        res = await self.db.execute(
            select(Member.area).where(Member.area != None, Member.area != "").distinct().order_by(Member.area)
        )
        return [r for r in res.scalars().all() if r]

    async def get_member_attendance_history(self, member_id: str) -> Dict[str, Any]:
        """
        جلب سجل الحضور والغياب الكامل للطفل المخدوم عبر كل الجلسات والفصول
        مع حساب نسبة الحضور الإجمالية وسلسلة الحضور وتقرير شهري.
        """
        from app.models.attendance import AttendanceSession, AttendanceRecord
        from app.models.class_group import ClassGroup, ClassGroupMember

        # 1. Get member info
        member = await self.get_by_member_id(member_id)
        if not member:
            return {}

        active_class_ids = [c["class_id"] for c in member.get("active_classes", [])]

        # 2. Get all sessions relevant to this member's classes (or general stage sessions)
        sess_query = select(
            AttendanceSession,
            ClassGroup.name.label("class_name")
        ).outerjoin(ClassGroup, AttendanceSession.class_id == ClassGroup.class_id)

        if active_class_ids:
            sess_query = sess_query.where(
                or_(
                    AttendanceSession.class_id.in_(active_class_ids),
                    and_(AttendanceSession.class_id == None, AttendanceSession.stage == member.get("stage", "ALL"))
                )
            )
        else:
            sess_query = sess_query.where(
                or_(
                    AttendanceSession.stage == member.get("stage", "ALL"),
                    AttendanceSession.stage == "ALL"
                )
            )

        sess_query = sess_query.order_by(AttendanceSession.session_date.desc(), AttendanceSession.created_at.desc())
        sess_res = await self.db.execute(sess_query)
        sessions = sess_res.all()

        # 3. Get all valid attendance records for this member
        rec_query = select(AttendanceRecord).where(
            AttendanceRecord.member_id == member_id,
            AttendanceRecord.status == "Valid"
        )
        rec_res = await self.db.execute(rec_query)
        records_by_session = {r.session_id: r for r in rec_res.scalars().all()}

        # 4. Build timeline items
        timeline = []
        attended_count = 0
        total_sessions = len(sessions)

        for s_row, class_name in sessions:
            rec = records_by_session.get(s_row.session_id)
            attended = (rec is not None)
            if attended:
                attended_count += 1

            timeline.append({
                "session_id": s_row.session_id,
                "session_date": s_row.session_date.isoformat() if s_row.session_date else None,
                "title": s_row.title,
                "class_id": s_row.class_id,
                "class_name": class_name or "اجتماع عام",
                "stage": s_row.stage,
                "attended": attended,
                "method": rec.method if rec else None,
                "scanned_at": rec.scanned_at.isoformat() if rec and rec.scanned_at else None,
            })

        percentage = round((attended_count / total_sessions * 100), 1) if total_sessions > 0 else 0.0

        # 5. Calculate monthly breakdown for the graph
        monthly = {}
        for item in timeline:
            if not item["session_date"]:
                continue
            month_key = item["session_date"][:7] # YYYY-MM
            if month_key not in monthly:
                monthly[month_key] = {"month": month_key, "total": 0, "attended": 0}
            monthly[month_key]["total"] += 1
            if item["attended"]:
                monthly[month_key]["attended"] += 1

        monthly_stats = []
        for m_key in sorted(monthly.keys()):
            m = monthly[m_key]
            m["rate"] = round((m["attended"] / m["total"] * 100), 1) if m["total"] > 0 else 0.0
            monthly_stats.append(m)

        # 6. Consecutive absences right now
        current_absence_streak = 0
        for item in timeline:
            if not item["attended"]:
                current_absence_streak += 1
            else:
                break

        return {
            "member_id": member_id,
            "member_name": member["full_name"],
            "total_sessions": total_sessions,
            "attended_count": attended_count,
            "absent_count": total_sessions - attended_count,
            "attendance_rate": percentage,
            "current_absence_streak": current_absence_streak,
            "timeline": timeline,
            "monthly_stats": monthly_stats
        }

