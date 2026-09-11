from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.seasons.repository import SeasonRepository
from app.seasons.schemas import SeasonCreate, SeasonUpdate
from app.core.errors import NotFoundException, BadRequestException

class SeasonService:
    def __init__(self, db: AsyncSession):
        self.repo = SeasonRepository(db)

    async def create_season(self, data: SeasonCreate) -> Dict[str, Any]:
        season_dict = data.model_dump()
        return await self.repo.create_season(season_dict)

    async def get_season(self, season_id: str) -> Dict[str, Any]:
        season = await self.repo.get_by_id(season_id)
        if not season:
            raise NotFoundException("الموسم غير موجود")
        return season

    async def list_seasons(self, active_only: bool = False) -> List[Dict[str, Any]]:
        return await self.repo.list_seasons(active_only=active_only)

    async def update_season(self, season_id: str, data: SeasonUpdate) -> Dict[str, Any]:
        existing = await self.repo.get_by_id(season_id)
        if not existing:
            raise NotFoundException("الموسم غير موجود")
        
        update_dict = data.model_dump(exclude_unset=True)
        if "start_date" in update_dict or "end_date" in update_dict:
            start_date = update_dict.get("start_date", existing["start_date"])
            end_date = update_dict.get("end_date", existing["end_date"])
            if end_date <= start_date:
                raise BadRequestException("تاريخ نهاية الموسم يجب أن يكون بعد تاريخ البداية")
                
        return await self.repo.update_season(season_id, update_dict)
