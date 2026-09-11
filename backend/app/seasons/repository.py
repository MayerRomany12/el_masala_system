import secrets
from typing import Optional, List, Dict, Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.models.season import Season
from app.core.errors import AppException, BadRequestException


class SeasonRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_season(self, data: Dict[str, Any]) -> Dict[str, Any]:
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            candidate_id = f"SSN-{rand_num:06d}"
            season = Season(season_id=candidate_id, **data)
            self.db.add(season)
            try:
                await self.db.flush()
                await self.db.refresh(season)
                return self._row_to_dict(season)
            except IntegrityError:
                await self.db.rollback()
                continue
        raise AppException(message="تعذر إنشاء موسم جديد، يرجى المحاولة مرة أخرى")

    async def get_by_id(self, season_id: str) -> Optional[Dict[str, Any]]:
        res = await self.db.execute(select(Season).where(Season.season_id == season_id))
        s = res.scalar_one_or_none()
        return self._row_to_dict(s) if s else None

    async def list_seasons(self, active_only: bool = False) -> List[Dict[str, Any]]:
        query = select(Season).order_by(Season.start_date.desc())
        if active_only:
            query = query.where(Season.is_active == True)
        res = await self.db.execute(query)
        return [self._row_to_dict(s) for s in res.scalars().all()]

    async def update_season(self, season_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not data:
            return await self.get_by_id(season_id)
        await self.db.execute(
            update(Season)
            .where(Season.season_id == season_id)
            .values(**data)
        )
        await self.db.flush()
        return await self.get_by_id(season_id)

    def _row_to_dict(self, s: Season) -> Dict[str, Any]:
        return {
            "season_id": s.season_id,
            "name": s.name,
            "start_date": s.start_date,
            "end_date": s.end_date,
            "is_active": s.is_active,
            "description": s.description,
            "created_at": s.created_at
        }
