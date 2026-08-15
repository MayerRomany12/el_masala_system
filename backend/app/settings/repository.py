from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.setting import SystemSetting


class SettingsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_settings(self) -> Dict[str, str]:
        res = await self.db.execute(select(SystemSetting))
        rows = res.scalars().all()
        return {s.key: s.value for s in rows}

    async def get_setting_value(self, key: str, default_val: str) -> str:
        res = await self.db.execute(select(SystemSetting.value).where(SystemSetting.key == key))
        val = res.scalar_one_or_none()
        return val if val is not None else default_val

    async def update_settings(self, settings_dict: Dict[str, str]) -> Dict[str, str]:
        now = datetime.now(timezone.utc)
        for key, val in settings_dict.items():
            res = await self.db.execute(select(SystemSetting).where(SystemSetting.key == key))
            item = res.scalar_one_or_none()
            if item:
                await self.db.execute(
                    update(SystemSetting)
                    .where(SystemSetting.key == key)
                    .values(value=str(val), updated_at=now)
                )
            else:
                self.db.add(SystemSetting(key=key, value=str(val)))
        await self.db.flush()
        return await self.get_all_settings()
