from typing import Optional, List, Dict, Any
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from app.birthdays.repository import BirthdayRepository
from app.birthdays.schemas import GiftDeliverRequest
from app.shared.utils import format_whatsapp_phone


class BirthdayService:
    def __init__(self, db: AsyncSession):
        self.repo = BirthdayRepository(db)

    async def get_birthdays(
        self,
        period: str = "today",
        stage: Optional[str] = None,
        gift_status: Optional[str] = None,
        month: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        raw_items = await self.repo.get_birthdays(period=period, stage=stage, gift_status=gift_status, month=month)
        
        today_dt = date.today()
        current_year = today_dt.year

        processed = []
        for item in raw_items:
            dob_str = item.get("date_of_birth")
            age = None
            if dob_str:
                try:
                    if isinstance(dob_str, date):
                        dob = dob_str
                    else:
                        dob = datetime.strptime(str(dob_str)[:10], "%Y-%m-%d").date()
                    age = current_year - dob.year - ((today_dt.month, today_dt.day) < (dob.month, dob.day))
                except Exception:
                    age = None

            # Compute Target Phone (Priority: member_phone > phone > secondary_phone)
            target_phone = None
            target_phone_owner = "لا يوجد هاتف"

            m_phone = item.get("member_phone")
            p_phone = item.get("phone")
            s_phone = item.get("secondary_phone")

            if m_phone and str(m_phone).strip():
                target_phone = str(m_phone).strip()
                target_phone_owner = "الطفل المخدوم"
            elif p_phone and str(p_phone).strip():
                target_phone = str(p_phone).strip()
                target_phone_owner = "ولي الأمر الرئيسي"
            elif s_phone and str(s_phone).strip():
                target_phone = str(s_phone).strip()
                target_phone_owner = "ولي الأمر الثانوي"

            item["age"] = age
            item["target_phone"] = target_phone
            item["target_phone_owner"] = target_phone_owner
            item["whatsapp_target_phone"] = format_whatsapp_phone(target_phone) if target_phone else None

            processed.append(item)

        return processed

    async def deliver_gift(self, data: GiftDeliverRequest, delivered_by: str) -> Dict[str, Any]:
        return await self.repo.deliver_gift(
            member_id=data.member_id,
            gift_name=data.gift_name,
            delivered_by=delivered_by,
            notes=data.notes
        )

    async def get_member_gift_history(self, member_id: str) -> List[Dict[str, Any]]:
        return await self.repo.get_member_gift_history(member_id)
