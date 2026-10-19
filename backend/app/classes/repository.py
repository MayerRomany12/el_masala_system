import secrets
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, update, func, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.class_group import ClassGroup, ClassGroupServant, ClassGroupMember
from app.models.season import Season
from app.models.member import Member
from app.models.user import User
from app.core.errors import AppException, BadRequestException, NotFoundException, ConflictException


class ClassRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_class_group(self, data: Dict[str, Any]) -> Dict[str, Any]:
        prefix = "SMR" if data.get("group_type") == "Summer" else "CLS"
        valid_cols = {c.name for c in ClassGroup.__table__.columns}
        clean_data = dict(data)
        if "is_active" in clean_data and "status" not in clean_data:
            clean_data["status"] = "Active" if clean_data["is_active"] else "Inactive"
        clean_data = {k: v for k, v in clean_data.items() if k in valid_cols and k != "class_id"}

        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"{prefix}-{rand_num:06d}"
            class_group = ClassGroup(class_id=candidate_id, **clean_data)
            self.db.add(class_group)
            try:
                await self.db.flush()
                await self.db.refresh(class_group)
                return await self.get_by_id(class_group.class_id)
            except IntegrityError:
                await self.db.rollback()
                continue
        raise AppException(message="تعذر إنشاء مجموعة جديدة، يرجى المحاولة مرة أخرى")

    async def get_by_id(self, class_id: str) -> Optional[Dict[str, Any]]:
        query = (
            select(
                ClassGroup,
                Season.name.label("season_name"),
                func.count(func.distinct(ClassGroupMember.membership_id)).label("active_members_count"),
                func.count(func.distinct(ClassGroupServant.assignment_id)).label("active_servants_count")
            )
            .outerjoin(Season, ClassGroup.season_id == Season.season_id)
            .outerjoin(
                ClassGroupMember,
                and_(ClassGroupMember.class_id == ClassGroup.class_id, ClassGroupMember.is_active == True)
            )
            .outerjoin(
                ClassGroupServant,
                and_(ClassGroupServant.class_id == ClassGroup.class_id, ClassGroupServant.is_active == True)
            )
            .where(ClassGroup.class_id == class_id)
            .group_by(ClassGroup.class_id, Season.name)
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            return None
        
        cg, season_name, active_members_count, active_servants_count = row
        d = self._row_to_dict(cg)
        d["season_name"] = season_name
        d["active_members_count"] = active_members_count
        d["active_servants_count"] = active_servants_count
        return d

    async def list_classes(
        self,
        group_type: Optional[str] = None,
        season_id: Optional[str] = None,
        stage: Optional[str] = None,
        status: Optional[str] = None,
        is_active: Optional[bool] = None,
        allowed_class_ids: Optional[List[str]] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        query = (
            select(
                ClassGroup,
                Season.name.label("season_name"),
                func.count(func.distinct(ClassGroupMember.membership_id)).label("active_members_count"),
                func.count(func.distinct(ClassGroupServant.assignment_id)).label("active_servants_count")
            )
            .outerjoin(Season, ClassGroup.season_id == Season.season_id)
            .outerjoin(
                ClassGroupMember,
                and_(ClassGroupMember.class_id == ClassGroup.class_id, ClassGroupMember.is_active == True)
            )
            .outerjoin(
                ClassGroupServant,
                and_(ClassGroupServant.class_id == ClassGroup.class_id, ClassGroupServant.is_active == True)
            )
            .group_by(ClassGroup.class_id, Season.name)
            .order_by(ClassGroup.class_id)   # ترتيب ثابت بالـ ID
            .limit(limit)
        )

        filters = []
        if allowed_class_ids is not None:
            filters.append(ClassGroup.class_id.in_(allowed_class_ids))
        if group_type:
            filters.append(ClassGroup.group_type == group_type)
        if season_id:
            filters.append(ClassGroup.season_id == season_id)
        if stage:
            filters.append(ClassGroup.stage == stage)
        if status:
            filters.append(ClassGroup.status == status)
        if is_active is not None:
            if is_active:
                filters.append(ClassGroup.status == "Active")
            else:
                filters.append(ClassGroup.status != "Active")

        if filters:
            query = query.where(and_(*filters))

        res = await self.db.execute(query)
        results = []
        for row in res.all():
            cg, season_name, active_members_count, active_servants_count = row
            d = self._row_to_dict(cg)
            d["season_name"] = season_name
            d["active_members_count"] = active_members_count
            d["active_servants_count"] = active_servants_count
            results.append(d)

        return results


    async def update_class_group(self, class_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not data:
            return await self.get_by_id(class_id)
        
        valid_cols = {c.name for c in ClassGroup.__table__.columns}
        clean_data = dict(data)
        if "is_active" in clean_data and "status" not in clean_data:
            clean_data["status"] = "Active" if clean_data["is_active"] else "Inactive"
        clean_data = {k: v for k, v in clean_data.items() if k in valid_cols and k != "class_id"}

        if clean_data:
            await self.db.execute(
                update(ClassGroup)
                .where(ClassGroup.class_id == class_id)
                .values(**clean_data)
            )
            await self.db.flush()
        return await self.get_by_id(class_id)

    # ---------------- SERVANTS MANAGEMENT ---------------- #
    async def assign_servant(self, class_id: str, servant_id: str, role: str = "Servant") -> Dict[str, Any]:
        # Check active assignment
        res = await self.db.execute(
            select(ClassGroupServant).where(
                ClassGroupServant.class_id == class_id,
                ClassGroupServant.servant_id == servant_id,
                ClassGroupServant.is_active == True
            )
        )
        if res.scalar_one_or_none():
            raise ConflictException("الخادم معين بالفعل كخادم نشط في هذا الفصل")

        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"CGS-{rand_num:06d}"
            assignment = ClassGroupServant(
                assignment_id=candidate_id,
                class_id=class_id,
                servant_id=servant_id,
                role=role,
                is_active=True,
                joined_at=datetime.now(timezone.utc)
            )
            self.db.add(assignment)
            try:
                await self.db.flush()
                await self.db.refresh(assignment)
                return {
                    "assignment_id": assignment.assignment_id,
                    "class_id": assignment.class_id,
                    "servant_id": assignment.servant_id,
                    "role": assignment.role,
                    "is_active": assignment.is_active,
                    "joined_at": assignment.joined_at
                }
            except IntegrityError:
                await self.db.rollback()
                continue
        raise AppException(message="تعذر تعيين الخادم للفصل")

    async def unassign_servant(self, class_id: str, servant_id: str) -> bool:
        res = await self.db.execute(
            select(ClassGroupServant).where(
                ClassGroupServant.class_id == class_id,
                ClassGroupServant.servant_id == servant_id,
                ClassGroupServant.is_active == True
            )
        )
        assignment = res.scalar_one_or_none()
        if not assignment:
            raise NotFoundException("تعيين الخادم غير موجود أو تم إغلاقه بالفعل")

        assignment.is_active = False
        assignment.left_at = datetime.now(timezone.utc)
        await self.db.flush()
        return True

    async def list_class_servants(self, class_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        query = (
            select(ClassGroupServant, User.full_name, User.phone)
            .join(User, ClassGroupServant.servant_id == User.user_id)
            .where(ClassGroupServant.class_id == class_id)
        )
        if active_only:
            query = query.where(ClassGroupServant.is_active == True)

        res = await self.db.execute(query)
        servants = []
        for row in res.all():
            cgs, full_name, phone = row
            servants.append({
                "assignment_id": cgs.assignment_id,
                "class_id": cgs.class_id,
                "servant_id": cgs.servant_id,
                "full_name": full_name,
                "phone": phone,
                "role": cgs.role,
                "is_active": cgs.is_active,
                "joined_at": cgs.joined_at,
                "left_at": cgs.left_at
            })
        return servants

    # ---------------- MEMBERS MANAGEMENT ---------------- #
    async def add_member(self, class_id: str, member_id: str) -> Dict[str, Any]:
        clean_cid = class_id.strip()
        clean_mid = member_id.strip().upper()
        # Check active membership
        res = await self.db.execute(
            select(ClassGroupMember).where(
                func.upper(ClassGroupMember.class_id) == clean_cid.upper(),
                func.upper(ClassGroupMember.member_id) == clean_mid,
                ClassGroupMember.is_active == True
            )
        )
        existing = res.scalar_one_or_none()
        if existing:
            return {
                "membership_id": existing.membership_id,
                "class_id": existing.class_id,
                "member_id": existing.member_id,
                "is_active": existing.is_active,
                "joined_at": existing.joined_at,
                "left_at": existing.left_at
            }

        now_ts = datetime.now(timezone.utc)
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"CGM-{rand_num:06d}"
            membership = ClassGroupMember(
                membership_id=candidate_id,
                class_id=clean_cid,
                member_id=clean_mid,
                is_active=True,
                joined_at=now_ts,
                left_at=None
            )
            self.db.add(membership)
            try:
                await self.db.flush()
                await self.db.refresh(membership)
                return {
                    "membership_id": membership.membership_id,
                    "class_id": membership.class_id,
                    "member_id": membership.member_id,
                    "is_active": membership.is_active,
                    "joined_at": membership.joined_at,
                    "left_at": membership.left_at
                }
            except IntegrityError:
                await self.db.rollback()
                continue
        raise AppException(message="تعذر إضافة المخدوم للفصل")

    async def transfer_member(self, from_class_id: str, to_class_id: str, member_id: str) -> Dict[str, Any]:
        now_ts = datetime.now(timezone.utc)
        
        # 1. Deactivate old active membership
        res = await self.db.execute(
            select(ClassGroupMember).where(
                ClassGroupMember.class_id == from_class_id,
                ClassGroupMember.member_id == member_id,
                ClassGroupMember.is_active == True
            )
        )
        old_membership = res.scalar_one_or_none()
        if not old_membership:
            raise NotFoundException("عضوية المخدوم في الفصل الحالي غير موجودة أو غير نشطة")

        old_membership.is_active = False
        old_membership.left_at = now_ts

        # 2. Add to new class in the same transaction
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"CGM-{rand_num:06d}"
            new_membership = ClassGroupMember(
                membership_id=candidate_id,
                class_id=to_class_id,
                member_id=member_id,
                is_active=True,
                joined_at=now_ts,
                left_at=None
            )
            self.db.add(new_membership)
            try:
                await self.db.flush()
                await self.db.refresh(new_membership)
                return {
                    "transferred_member_id": member_id,
                    "from_class_id": from_class_id,
                    "to_class_id": to_class_id,
                    "old_membership_left_at": old_membership.left_at,
                    "new_membership_id": new_membership.membership_id,
                    "joined_at": new_membership.joined_at
                }
            except IntegrityError:
                await self.db.rollback()
                continue
        raise AppException(message="تعذر إتمام عملية نقل المخدوم")

    async def remove_member(self, class_id: str, member_id: str) -> bool:
        res = await self.db.execute(
            select(ClassGroupMember).where(
                ClassGroupMember.class_id == class_id,
                ClassGroupMember.member_id == member_id,
                ClassGroupMember.is_active == True
            )
        )
        membership = res.scalar_one_or_none()
        if not membership:
            raise NotFoundException("عضوية المخدوم غير موجودة أو غير نشطة")

        membership.is_active = False
        membership.left_at = datetime.now(timezone.utc)
        await self.db.flush()
        return True

    async def list_class_members(self, class_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        clean_cid = class_id.strip().upper()
        query = (
            select(
                ClassGroupMember,
                Member.full_name,
                Member.phone,
                Member.secondary_phone,
                Member.member_phone,
                Member.whatsapp_phone,
                Member.group_name,
                Member.stage,
                Member.area,
                Member.email,
                Member.photo_url,
                Member.gender,
                Member.father_of_confession
            )
            .join(Member, func.upper(ClassGroupMember.member_id) == func.upper(Member.member_id))
            .where(func.upper(ClassGroupMember.class_id) == clean_cid)
            .order_by(ClassGroupMember.joined_at.desc())
        )
        if active_only:
            query = query.where(ClassGroupMember.is_active == True)

        res = await self.db.execute(query)
        members = []
        for row in res.all():
            cgm, full_name, phone, secondary_phone, member_phone, whatsapp_phone, group_name, stage, area, email, photo_url, gender, father_of_confession = row
            members.append({
                "membership_id": cgm.membership_id,
                "class_id": cgm.class_id,
                "member_id": cgm.member_id,
                "full_name": full_name,
                "phone": phone or member_phone or secondary_phone or "",
                "secondary_phone": secondary_phone,
                "member_phone": member_phone,
                "whatsapp_phone": whatsapp_phone or "",
                "group_name": group_name or "",
                "stage": stage,
                "area": area or "",
                "email": email or "",
                "photo_url": photo_url,
                "gender": gender,
                "father_of_confession": father_of_confession,
                "is_active": cgm.is_active,
                "joined_at": cgm.joined_at,
                "left_at": cgm.left_at
            })
        return members

    async def delete_class_group(self, class_id: str) -> bool:
        cg = await self.db.scalar(select(ClassGroup).where(ClassGroup.class_id == class_id))
        if not cg:
            raise NotFoundException("الفصل أو المجموعة غير موجودة")

        # Clean up associations
        await self.db.execute(text("DELETE FROM class_group_members WHERE class_id = :cid").bindparams(cid=class_id))
        await self.db.execute(text("DELETE FROM class_group_servants WHERE class_id = :cid").bindparams(cid=class_id))
        try:
            await self.db.execute(text("DELETE FROM event_target_classes WHERE class_id = :cid").bindparams(cid=class_id))
        except Exception:
            pass

        await self.db.delete(cg)
        await self.db.flush()
        return True

    async def wipe_all_classes_and_attendance(self) -> Dict[str, Any]:
        """
        مسح جميع الفصول وجلسات وسجلات الحضور السابقة للبدء على نظافة تامة
        """
        from app.models.setting import SystemSetting
        # 1. Clean attendance
        await self.db.execute(text("DELETE FROM attendance_records"))
        await self.db.execute(text("DELETE FROM attendance_session_servants"))
        await self.db.execute(text("DELETE FROM attendance_sessions"))

        # 2. Clean followup
        await self.db.execute(text("DELETE FROM followup_logs"))
        await self.db.execute(text("DELETE FROM followup_tasks"))

        # 3. Clean classes associations
        await self.db.execute(text("DELETE FROM class_group_members"))
        await self.db.execute(text("DELETE FROM class_group_servants"))
        try:
            await self.db.execute(text("DELETE FROM event_target_classes"))
        except Exception:
            pass

        # 4. Clean class groups
        await self.db.execute(text("DELETE FROM class_groups"))

        # 5. Ensure classes_seeded_once is set so nothing gets auto-re-seeded
        q_seeded = await self.db.execute(
            select(SystemSetting).where(SystemSetting.key == "classes_seeded_once")
        )
        existing_s = q_seeded.scalar_one_or_none()
        if existing_s:
            existing_s.value = "true"
        else:
            self.db.add(SystemSetting(
                key="classes_seeded_once",
                value="true",
                description="تم عمل التهيئة الأولى للفصول - يمنع إعادة زرع الفصول المحذوفة"
            ))

        await self.db.commit()
        return {
            "message": "تم مسح جميع الفصول وجلسات الحضور السابقة بنجاح. يمكنك الآن إضافة فصولك الجديدة على نظافة تامة ولن تعود الفصول المحذوفة مجدداً."
        }

    async def promote_new_coptic_year(self, superadmin_user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        الترقية السنوية وتصفير العام القبطي الجديد:
        1. ترحيل جميع أطفال فصول مدارس الأحد للمراحل التالية تصاعدياً
        2. حضانة وجامعيين وخريجين يبقون كما هم دون نقل
        3. تصفير جلسات وسجلات الحضور والغياب
        4. تصفير مهام وسجلات الافتقاد
        5. تصفير رصيد المكافآت والنقاط وحركاتها
        6. تصفير سجل العمليات (Audit Logs)
        """
        # Helper to determine grade rank of a class
        def _get_rank(c_name: str, c_slug: Optional[str], c_stage: Optional[str]) -> Optional[int]:
            cn = (c_name or "").strip().lower()
            cs = (c_slug or "").strip().lower() if c_slug else ""
            cstg = (c_stage or "").strip().lower() if c_stage else ""

            if any(k in cn or k in cs or k in cstg for k in ["حضانة", "حضانه", "kg", "nursery"]):
                return 0  # Nursery: Stay in place

            if any(k in cn or k in cs or k in cstg for k in ["جامعيين وخريجين", "جامعيين", "خريجين", "جامعة", "خريج", "university", "graduate"]):
                return 13  # University & Graduates: Stay in place

            # Combined primary classes
            if any(k in cn for k in ["أولى وتانية", "اولى وتانية", "أول وتاني", "اول وتانى"]):
                return 102
            if any(k in cn for k in ["تالتة ورابعة", "تالته ورابعه", "تالت ورابع"]):
                return 104
            if any(k in cn for k in ["خامسة وسادسة", "خامسه وسادسه", "خامس وسادس"]):
                return 106

            # Primary (1-6)
            if "ابتدائي" in cn or "ابتدائى" in cn or "primary" in cs or "ابتدائي" in cstg:
                if any(k in cn for k in ["سادس", "سادسة", "6"]) or "primary_6" in cs:
                    return 6
                if any(k in cn for k in ["خامس", "خامسة", "5"]) or "primary_5" in cs:
                    return 5
                if any(k in cn for k in ["رابع", "رابعة", "4"]) or "primary_4" in cs:
                    return 4
                if any(k in cn for k in ["تالت", "تالتة", "ثالث", "3"]) or "primary_3" in cs:
                    return 3
                if any(k in cn for k in ["تان", "تانية", "ثاني", "2"]) or "primary_2" in cs:
                    return 2
                if any(k in cn for k in ["اول", "أول", "أولى", "اولى", "1"]) or "primary_1" in cs:
                    return 1

            # Preparatory (7-9)
            if "إعدادي" in cn or "اعدادي" in cn or "prep" in cs or "إعدادي" in cstg:
                if any(k in cn for k in ["تالت", "تالتة", "ثالث", "3"]) or "prep_3" in cs:
                    return 9
                if any(k in cn for k in ["تان", "تانية", "ثاني", "2"]) or "prep_2" in cs:
                    return 8
                if any(k in cn for k in ["اول", "أول", "أولى", "اولى", "1"]) or "prep_1" in cs:
                    return 7

            # Secondary (10-12)
            if "ثانوي" in cn or "ثانوى" in cn or "sec" in cs or "secondary" in cs or "ثانوي" in cstg:
                if any(k in cn for k in ["تالت", "تالتة", "ثالث", "3"]) or "sec_3" in cs:
                    return 12
                if any(k in cn for k in ["تان", "تانية", "ثاني", "2"]) or "sec_2" in cs:
                    return 11
                if any(k in cn for k in ["اول", "أول", "أولى", "اولى", "1"]) or "sec_1" in cs:
                    return 10

            return None

        TARGET_RANK_MAP = {
            1: 2,    # أولى ابتدائي -> تانية ابتدائي
            2: 3,    # تانية ابتدائي -> تالتة ابتدائي
            3: 4,    # تالتة ابتدائي -> رابعة ابتدائي
            4: 5,    # رابعة ابتدائي -> خامسة ابتدائي
            5: 6,    # خامسة ابتدائي -> سادسة ابتدائي
            6: 7,    # سادسة ابتدائي -> أولى إعدادي
            7: 8,    # أولى إعدادي -> تانية إعدادي
            8: 9,    # تانية إعدادي -> تالتة إعدادي
            9: 10,   # تالتة إعدادي -> أولى ثانوي
            10: 11,  # أولى ثانوي -> تانية ثانوي
            11: 12,  # تانية ثانوي -> تالتة ثانوي
            12: 13,  # تالتة ثانوي -> جامعيين وخريجين
            # Combined
            102: 104, # أولى وتانية -> تالتة ورابعة
            104: 106, # تالتة ورابعة -> خامسة وسادسة
            106: 7,   # خامسة وسادسة -> أولى إعدادي
        }

        STAGE_BY_RANK = {
            0: "حضانة",
            1: "ابتدائي", 2: "ابتدائي", 3: "ابتدائي", 4: "ابتدائي", 5: "ابتدائي", 6: "ابتدائي",
            7: "إعدادي", 8: "إعدادي", 9: "إعدادي",
            10: "ثانوي", 11: "ثانوي", 12: "ثانوي",
            13: "جامعيين وخريجين",
            102: "ابتدائي", 104: "ابتدائي", 106: "ابتدائي"
        }

        # 1. Fetch all classes
        c_rows = (await self.db.execute(select(ClassGroup))).scalars().all()
        class_rank_dict = {}
        rank_to_class = {}

        for cg in c_rows:
            r = _get_rank(cg.name, cg.slug, cg.stage)
            if r is not None:
                class_rank_dict[cg.class_id] = r
                if r not in rank_to_class:
                    rank_to_class[r] = cg

        # 2. Process all active members and their current class
        m_memberships = (await self.db.execute(
            select(ClassGroupMember).where(ClassGroupMember.is_active == True)
        )).scalars().all()

        promoted_count = 0
        stayed_count = 0
        now_ts = datetime.now(timezone.utc)

        for cgm in m_memberships:
            curr_rank = class_rank_dict.get(cgm.class_id)
            if curr_rank is None or curr_rank == 0 or curr_rank == 13:
                # Nursery or University/Graduates -> Stay in place
                stayed_count += 1
                continue

            target_rank = TARGET_RANK_MAP.get(curr_rank)
            if target_rank is not None:
                target_class = rank_to_class.get(target_rank)
                new_stage = STAGE_BY_RANK.get(target_rank, "عام")

                if target_class and target_class.class_id != cgm.class_id:
                    # Deactivate old membership
                    cgm.is_active = False
                    cgm.left_at = now_ts

                    # Create new membership in target class
                    rand_id = f"CGM-{secrets.randbelow(1_000_000):06d}"
                    self.db.add(ClassGroupMember(
                        membership_id=rand_id,
                        class_id=target_class.class_id,
                        member_id=cgm.member_id,
                        joined_at=now_ts,
                        is_active=True,
                        created_by=superadmin_user_id
                    ))

                # Update Member stage
                await self.db.execute(
                    update(Member)
                    .where(Member.member_id == cgm.member_id)
                    .values(stage=new_stage, updated_at=now_ts)
                )
                promoted_count += 1

        # 3. Complete Resets for the New Coptic Year
        # Delete attendance sessions & records
        await self.db.execute(text("DELETE FROM attendance_records"))
        await self.db.execute(text("DELETE FROM attendance_sessions"))

        # Delete followup tasks & logs
        await self.db.execute(text("DELETE FROM followup_logs"))
        await self.db.execute(text("DELETE FROM followup_tasks"))

        # Reset member points & rewards
        await self.db.execute(text("DELETE FROM points_transactions"))
        await self.db.execute(text("UPDATE members SET total_points = 0"))

        # Clear audit logs
        await self.db.execute(text("DELETE FROM audit_logs"))

        await self.db.commit()

        return {
            "success": True,
            "promoted_count": promoted_count,
            "stayed_count": stayed_count,
            "message": f"تمت ترقية {promoted_count} مخدوم للمراحل الدراسية التالية وتصفير كافة سجلات الحضور والافتقاد والنقاط وسجل العمليات بنجاح للعام القبطي الجديد 🎉"
        }

    def _row_to_dict(self, cg: ClassGroup) -> Dict[str, Any]:
        status_val = getattr(cg, "status", "Active")
        return {
            "class_id": cg.class_id,
            "name": cg.name,
            "slug": getattr(cg, "slug", None),
            "group_type": cg.group_type,
            "season_id": cg.season_id,
            "stage": cg.stage,
            "description": cg.description,
            "status": status_val,
            "is_active": (status_val == "Active"),
            "created_at": cg.created_at
        }
