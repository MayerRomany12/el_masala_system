from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.birthdays.repository import BirthdayRepository
from app.birthdays.schemas import GiftDeliverRequest


class BirthdayService:
    def __init__(self, db: AsyncSession):
        self.repo = BirthdayRepository(db)

    async def get_birthdays(
        self,
        period: str = "today",
        stage: Optional[str] = None,
        gift_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return await self.repo.get_birthdays(period=period, stage=stage, gift_status=gift_status)

    async def deliver_gift(self, data: GiftDeliverRequest, delivered_by: str) -> Dict[str, Any]:
        return await self.repo.deliver_gift(
            member_id=data.member_id,
            gift_name=data.gift_name,
            delivered_by=delivered_by,
            notes=data.notes
        )

    async def get_member_gift_history(self, member_id: str) -> List[Dict[str, Any]]:
        return await self.repo.get_member_gift_history(member_id)
