import secrets
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, update, func, and_
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
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"{prefix}-{rand_num:06d}"
            class_group = ClassGroup(class_id=candidate_id, **data)
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
        is_active: Optional[bool] = None
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
            .order_by(ClassGroup.created_at.desc())
        )

        filters = []
        if group_type:
            filters.append(ClassGroup.group_type == group_type)
        if season_id:
            filters.append(ClassGroup.season_id == season_id)
        if stage:
            filters.append(ClassGroup.stage == stage)
        if is_active is not None:
            filters.append(ClassGroup.is_active == is_active)

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
        
        await self.db.execute(
            update(ClassGroup)
            .where(ClassGroup.class_id == class_id)
            .values(**data)
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
        # Check active membership
        res = await self.db.execute(
            select(ClassGroupMember).where(
                ClassGroupMember.class_id == class_id,
                ClassGroupMember.member_id == member_id,
                ClassGroupMember.is_active == True
            )
        )
        if res.scalar_one_or_none():
            raise ConflictException("المخدوم مسجل بالفعل كعضو نشط في هذا الفصل")

        now_ts = datetime.now(timezone.utc)
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"CGM-{rand_num:06d}"
            membership = ClassGroupMember(
                membership_id=candidate_id,
                class_id=class_id,
                member_id=member_id,
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
        query = (
            select(
                ClassGroupMember,
                Member.full_name,
                Member.phone,
                Member.stage,
                Member.educational_year
            )
            .join(Member, ClassGroupMember.member_id == Member.member_id)
            .where(ClassGroupMember.class_id == class_id)
            .order_by(ClassGroupMember.joined_at.desc())
        )
        if active_only:
            query = query.where(ClassGroupMember.is_active == True)

        res = await self.db.execute(query)
        members = []
        for row in res.all():
            cgm, full_name, phone, stage, educational_year = row
            members.append({
                "membership_id": cgm.membership_id,
                "class_id": cgm.class_id,
                "member_id": cgm.member_id,
                "full_name": full_name,
                "phone": phone,
                "stage": stage,
                "educational_year": educational_year,
                "is_active": cgm.is_active,
                "joined_at": cgm.joined_at,
                "left_at": cgm.left_at
            })
        return members

    def _row_to_dict(self, cg: ClassGroup) -> Dict[str, Any]:
        return {
            "class_id": cg.class_id,
            "name": cg.name,
            "group_type": cg.group_type,
            "season_id": cg.season_id,
            "stage": cg.stage,
            "educational_year": cg.educational_year,
            "description": cg.description,
            "is_active": cg.is_active,
            "created_at": cg.created_at
        }
