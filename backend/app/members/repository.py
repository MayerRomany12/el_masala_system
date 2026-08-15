import secrets
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timezone

from sqlalchemy import select, update, func, or_, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.member import Member
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
        "whatsapp_phone": row.whatsapp_phone,
        "father_of_confession": row.father_of_confession,
        "address": row.address,
        "notes": row.notes,
        "status": row.status,
        "qr_token": row.qr_token,
        "card_issued_at": row.card_issued_at,
        "total_points": row.total_points,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
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
        return _row_to_dict(row) if row else None

    async def get_members(
        self,
        search: Optional[str] = None,
        stage: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = select(Member)

        if status:
            query = query.where(Member.status == status)
        if stage:
            query = query.where(Member.stage == stage)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Member.full_name.ilike(pattern),
                    Member.phone.ilike(pattern),
                    Member.member_id.ilike(pattern),
                    Member.group_name.ilike(pattern),
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_q)
        total = total_result.scalar_one()

        query = query.order_by(Member.created_at.desc()).offset(skip).limit(limit)
        items_result = await self.db.execute(query)
        items = [_row_to_dict(r) for r in items_result.scalars().all()]

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

        return {
            "total_members": total,
            "active_members": active,
            "inactive_members": inactive,
            "stages_count": len(distinct_stages),
            "stages_list": list(distinct_stages),
        }
