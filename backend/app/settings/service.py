from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.settings.repository import SettingsRepository


class SettingsService:
    def __init__(self, db: AsyncSession):
        self.repo = SettingsRepository(db)

    async def get_settings(self) -> Dict[str, str]:
        return await self.repo.get_all_settings()

    async def update_settings(self, new_settings: Dict[str, str]) -> Dict[str, str]:
        return await self.repo.update_settings(new_settings)
