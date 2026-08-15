from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class SystemSettingItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: Optional[datetime] = None


class SystemSettingsUpdateSchema(BaseModel):
    settings: Dict[str, str] = Field(..., description="قاموس مفاتيح وقيم الإعدادات الديناميكية لتحديثها")
