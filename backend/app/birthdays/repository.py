import secrets
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta, timezone

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.member import Member
from app.models.user import User
from app.models.birthday import BirthdayGiftDelivery
from app.core.errors import AppException, BadRequestException, NotFoundException


def _parse_dob_string(dob_val: Any) -> Optional[date]:
    """
    Parse date_of_birth (date object or string) to date object.
    Supports native date objects as well as strings: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/YYYY
    """
    if not dob_val:
        return None
    if isinstance(dob_val, datetime):
        return dob_val.date()
    if isinstance(dob_val, date):
        return dob_val
    s = str(dob_val).strip()
    if not s:
        return None
    # Try YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    # Try MM/YYYY or MM-YYYY
    for fmt in ("%m/%Y", "%m-%Y"):
        try:
            return datetime.strptime(s, fmt).replace(day=1).date()
        except Exception:
            continue
    return None


class BirthdayRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_birthdays(
        self,
        period: str = "today",  # today, week, month, all
        stage: Optional[str] = None,
        gift_status: Optional[str] = None  # Delivered, Pending
    ) -> List[Dict[str, Any]]:
        query = select(Member).where(
            Member.status == "Active",
            Member.date_of_birth.isnot(None)
        )
        if stage and stage != "ALL":
            stage_prefix = stage.split('-')[0].strip()
            query = query.where(Member.stage.ilike(f"%{stage_prefix}%"))

        members = (await self.db.execute(query)).scalars().all()

        today_dt = date.today()
        current_year = today_dt.year

        # Pre-fetch all gift deliveries for current year
        deliveries_q = (
            select(BirthdayGiftDelivery, User.full_name.label("delivered_by_name"))
            .outerjoin(User, BirthdayGiftDelivery.delivered_by == User.user_id)
            .where(BirthdayGiftDelivery.year == current_year)
        )
        deliv_rows = (await self.db.execute(deliveries_q)).all()
        # key = member_id → (delivery_obj, delivered_by_name)
        deliveries_map = {d.member_id: (d, u_name) for d, u_name in deliv_rows}

        results = []
        for m in members:
            # Parse date_of_birth string to date object
            dob_val = _parse_dob_string(m.date_of_birth)
            if not dob_val:
                continue

            # Calculate Age
            age = current_year - dob_val.year - (
                (today_dt.month, today_dt.day) < (dob_val.month, dob_val.day)
            )

            # Filter by Period
            is_match = False
            b_month, b_day = dob_val.month, dob_val.day

            if period == "today":
                is_match = (b_month == today_dt.month and b_day == today_dt.day)
            elif period == "week":
                for i in range(7):
                    target_d = today_dt + timedelta(days=i)
                    if b_month == target_d.month and b_day == target_d.day:
                        is_match = True
                        break
            elif period == "month":
                is_match = (b_month == today_dt.month and b_day >= today_dt.day)
            else:
                # "all" or any other value → include everything
                is_match = True

            if not is_match:
                continue

            # Check Gift Delivery Status
            deliv_tuple = deliveries_map.get(m.member_id)
            has_deliv = deliv_tuple is not None
            current_status = "Delivered" if has_deliv else "Pending"

            if gift_status and gift_status != "ALL" and current_status != gift_status:
                continue

            deliv_info = None
            if has_deliv:
                d_obj, d_user = deliv_tuple
                deliv_info = {
                    "delivery_id": d_obj.delivery_id,
                    "gift_name": d_obj.gift_name,
                    "notes": d_obj.notes,
                    "delivered_by_name": d_user,
                    "delivered_at": d_obj.delivered_at
                }

            results.append({
                "member_id": m.member_id,
                "full_name": m.full_name,
                "stage": m.stage,
                "date_of_birth": m.date_of_birth,
                "age": age,
                "phone": m.phone,
                "whatsapp_phone": m.whatsapp_phone,
                "birthday_day": b_day,
                "birthday_month": b_month,
                "gift_status": current_status,
                "gift_delivery_info": deliv_info
            })

        # Sort results by birthday month/day
        results.sort(key=lambda x: (x["birthday_month"], x["birthday_day"]))
        return results

    async def deliver_gift(
        self,
        member_id: str,
        gift_name: str,
        delivered_by: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        res = await self.db.execute(select(Member).where(Member.member_id == member_id))
        member = res.scalar_one_or_none()
        if not member:
            raise NotFoundException(f"المخدوم برقم العضوية {member_id} غير موجود")

        current_year = date.today().year

        # Check existing delivery for current year
        chk_q = select(BirthdayGiftDelivery).where(
            BirthdayGiftDelivery.member_id == member_id,
            BirthdayGiftDelivery.year == current_year
        )
        existing = (await self.db.execute(chk_q)).scalar_one_or_none()
        if existing:
            raise BadRequestException(
                f"تم تسليم هدية عيد الميلاد لهذا المخدوم بالفعل لسنة {current_year} "
                f"(نوع الهدية: {existing.gift_name})."
            )

        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"GFT-{rand_num:06d}"

            deliv = BirthdayGiftDelivery(
                delivery_id=candidate_id,
                member_id=member_id,
                year=current_year,
                gift_name=gift_name,
                notes=notes,
                delivered_by=delivered_by
            )
            self.db.add(deliv)
            try:
                await self.db.flush()
                return await self.get_delivery_by_id(candidate_id)
            except IntegrityError:
                await self.db.rollback()
                continue

        raise BadRequestException(f"تم تسليم هدية عيد الميلاد لسنة {current_year} بالفعل لهذا الطفل")

    async def get_delivery_by_id(self, delivery_id: str) -> Optional[Dict[str, Any]]:
        query = (
            select(BirthdayGiftDelivery, User.full_name.label("delivered_by_name"))
            .outerjoin(User, BirthdayGiftDelivery.delivered_by == User.user_id)
            .where(BirthdayGiftDelivery.delivery_id == delivery_id)
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            return None
        d, u_name = row
        return {
            "delivery_id": d.delivery_id,
            "member_id": d.member_id,
            "year": d.year,
            "gift_name": d.gift_name,
            "notes": d.notes,
            "delivered_by_name": u_name,
            "delivered_at": d.delivered_at
        }

    async def get_member_gift_history(self, member_id: str) -> List[Dict[str, Any]]:
        query = (
            select(BirthdayGiftDelivery, User.full_name.label("delivered_by_name"))
            .outerjoin(User, BirthdayGiftDelivery.delivered_by == User.user_id)
            .where(BirthdayGiftDelivery.member_id == member_id)
            .order_by(BirthdayGiftDelivery.year.desc())
        )
        res = await self.db.execute(query)
        rows = res.all()
        return [{
            "delivery_id": d.delivery_id,
            "member_id": d.member_id,
            "year": d.year,
            "gift_name": d.gift_name,
            "notes": d.notes,
            "delivered_by_name": u_name,
            "delivered_at": d.delivered_at
        } for d, u_name in rows]
