from typing import Optional, List, Dict, Any
import secrets
from sqlalchemy.ext.asyncio import AsyncSession

from app.members.repository import MemberRepository
from app.members.schemas import MemberCreate, MemberUpdate, MemberStatusEnum
from app.core.errors import NotFoundException, BadRequestException
from app.shared.utils import normalize_phone_number, is_valid_whatsapp_number


def parse_dob(val: Any) -> Optional[Any]:
    from datetime import datetime, date
    if not val:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        clean = val.strip()
        if not clean:
            return None
        try:
            return datetime.strptime(clean, "%Y-%m-%d").date()
        except ValueError:
            raise BadRequestException("صيغة تاريخ الميلاد غير صالحة. يرجى اختيار تاريخ صحيح (YYYY-MM-DD)")
    return val


class MemberService:
    def __init__(self, db: AsyncSession):
        self.repository = MemberRepository(db)

    async def create_member(self, data: MemberCreate) -> Dict[str, Any]:
        from app.shared.utils import validate_full_name, is_valid_egyptian_mobile
        from datetime import datetime, timezone

        member_dict = data.model_dump()

        # Sanitize optional fields: convert empty string or whitespace to None
        for key in ["date_of_birth", "group_name", "father_of_confession", "address", "notes", "whatsapp_phone", "photo_url"]:
            if key in member_dict and member_dict[key] is not None:
                if isinstance(member_dict[key], str) and not member_dict[key].strip():
                    member_dict[key] = None

        # Parse date_of_birth string into Python date object for asyncpg PostgreSQL DATE column
        member_dict["date_of_birth"] = parse_dob(member_dict.get("date_of_birth"))

        # 1. Full name validation (at least 3 words, no numbers)
        if not validate_full_name(member_dict.get("full_name")):
            raise BadRequestException("اسم الطفل المخدوم يجب أن يكون ثلاثياً أو رباعياً على الأقل بدون أرقام (مثال: مارك فادي نبيل)")

        # 2. Egyptian Phone validation
        raw_phone = member_dict.get("phone")
        if not is_valid_egyptian_mobile(raw_phone):
            raise BadRequestException("رقم تليفون ولي الأمر يجب أن يكون رقم محمول مصري صالح مكون من 11 رقم يبدأ بـ (010 أو 011 أو 012 أو 015)")
        member_dict["phone"] = normalize_phone_number(raw_phone)

        # 3. WhatsApp Phone validation
        if member_dict.get("whatsapp_phone"):
            if not is_valid_whatsapp_number(member_dict["whatsapp_phone"]):
                raise BadRequestException("رقم الواتساب غير صالح. يرجى إدخال رقم محمول مصري صالح مكون من 11 رقم (010, 011, 012, 015)")
            member_dict["whatsapp_phone"] = normalize_phone_number(member_dict["whatsapp_phone"])
        else:
            member_dict["whatsapp_phone"] = member_dict["phone"]

        # 4. Auto-generate initial QR Token so the card is ready immediately
        member_dict["qr_token"] = secrets.token_hex(32)
        member_dict["card_issued_at"] = datetime.now(timezone.utc)

        try:
            return await self.repository.create_member(member_dict)
        except (BadRequestException, NotFoundException):
            raise
        except Exception as e:
            try:
                await self.repository.db.rollback()
            except Exception:
                pass
            raise BadRequestException(f"فشلت عملية حفظ المخدوم ببيانات السيرفر: {str(e)}")

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

        # Sanitize empty string fields to None
        for key in ["date_of_birth", "group_name", "father_of_confession", "address", "notes", "whatsapp_phone", "photo_url"]:
            if key in update_fields and update_fields[key] is not None:
                if isinstance(update_fields[key], str) and not update_fields[key].strip():
                    update_fields[key] = None

        if "date_of_birth" in update_fields:
            update_fields["date_of_birth"] = parse_dob(update_fields["date_of_birth"])

        if "whatsapp_phone" in update_fields and update_fields["whatsapp_phone"]:
            if not is_valid_whatsapp_number(update_fields["whatsapp_phone"]):
                raise BadRequestException("رقم الواتساب غير صالح. يرجى إدخال رقم محمول صالح مسجل عليه واتساب (مثل 010 أو 011 أو 012 أو 015)")
            update_fields["whatsapp_phone"] = normalize_phone_number(update_fields["whatsapp_phone"])

        if "phone" in update_fields and update_fields["phone"]:
            update_fields["phone"] = normalize_phone_number(update_fields["phone"])

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

    async def archive_member(self, member_id: str, is_archived: bool, current_user_id: Optional[str] = None) -> Dict[str, Any]:
        existing = await self.repository.get_by_member_id(member_id)
        if not existing:
            raise NotFoundException(f"المخدوم برقم العضوية {member_id} غير موجود")

        updated = await self.repository.archive_member(member_id, is_archived, current_user_id)
        return updated

    async def update_member_photo(self, member_id: str, photo_url: str) -> Dict[str, Any]:
        existing = await self.repository.get_by_member_id(member_id)
        if not existing:
            raise NotFoundException(f"المخدوم برقم العضوية {member_id} غير موجود")

        updated = await self.repository.update_member(member_id, {"photo_url": photo_url})
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
