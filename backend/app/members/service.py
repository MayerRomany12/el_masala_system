from typing import Optional, List, Dict, Any
import secrets
from sqlalchemy.ext.asyncio import AsyncSession

from app.members.repository import MemberRepository
from app.members.schemas import MemberCreate, MemberUpdate, MemberStatusEnum
from app.core.errors import NotFoundException, BadRequestException


class MemberService:
    def __init__(self, db: AsyncSession):
        self.repository = MemberRepository(db)

    async def create_member(self, data: MemberCreate) -> Dict[str, Any]:
        member_dict = data.model_dump()
        return await self.repository.create_member(member_dict)

    async def get_member_by_id(self, member_id: str) -> Dict[str, Any]:
        member = await self.repository.get_by_member_id(member_id)
        if not member:
            raise NotFoundException(f"المخدوم برقم العضوية {member_id} غير موجود")
        return member

    async def list_members(
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

        items, total = await self.repository.get_members(
            search=search, stage=stage, status=status, skip=skip, limit=limit
        )
        return {"total": total, "page": page, "limit": limit, "items": items}

    async def update_member(self, member_id: str, data: MemberUpdate) -> Dict[str, Any]:
        existing = await self.repository.get_by_member_id(member_id)
        if not existing:
            raise NotFoundException(f"المخدوم برقم العضوية {member_id} غير موجود")

        update_fields = data.model_dump(exclude_unset=True)
        if not update_fields:
            return existing

        updated = await self.repository.update_member(member_id, update_fields)
        if not updated:
            raise NotFoundException("فشل تعديل بيانات المخدوم")
        return updated

    async def update_member_status(self, member_id: str, new_status: str) -> Dict[str, Any]:
        valid_statuses = [MemberStatusEnum.ACTIVE, MemberStatusEnum.INACTIVE, MemberStatusEnum.ARCHIVED]
        if new_status not in valid_statuses:
            raise BadRequestException(f"الحالة غير صالحة. الحالات المسموحة: {', '.join(valid_statuses)}")

        existing = await self.repository.get_by_member_id(member_id)
        if not existing:
            raise NotFoundException(f"المخدوم برقم العضوية {member_id} غير موجود")

        updated = await self.repository.update_status(member_id, new_status)
        if not updated:
            raise NotFoundException("فشل تحديث حالة المخدوم")
        return updated

    async def get_stats(self) -> Dict[str, Any]:
        return await self.repository.get_stats()

    # ─── M3: QR Token & Card ──────────────────────────────────────────────────

    async def get_or_create_qr_token(self, member_id: str) -> Dict[str, Any]:
        """
        يُرجع بيانات البطاقة الكاملة مع الـ QR Token.
        إذا لم يكن للمخدوم token بعد، يُنشئه ويحفظه (مرة واحدة فقط).
        Token = Opaque Random Hex (32 bytes = 64 char) — لا يحتوي بيانات شخصية.
        """
        member = await self.repository.get_by_member_id(member_id)
        if not member:
            raise NotFoundException(f"المخدوم برقم العضوية {member_id} غير موجود")

        # إذا كان الـ Token موجوداً بالفعل، أُرجعه كما هو
        if member.get("qr_token"):
            return member

        # توليد Token آمن فريد
        new_token = secrets.token_hex(32)  # 64 حرف hex
        updated = await self.repository.set_qr_token(member_id, new_token)
        return updated

    async def scan_qr_token(self, token: str) -> Dict[str, Any]:
        """
        استلام الـ QR Token من الـ Scanner وإرجاع بيانات المخدوم.
        لا يُسجَّل أي حضور هنا — M5 هو المسؤول عن ذلك.
        """
        clean_token = token.strip().strip('"').strip("'")
        member = await self.repository.get_by_qr_token(clean_token)
        if not member:
            raise NotFoundException("رمز QR غير معروف أو غير مسجل بالنظام")
        return member
