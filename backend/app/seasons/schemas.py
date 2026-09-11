from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime


class SeasonCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="اسم الموسم أو السنة الخدمية (مثال: 2025/2026)")
    start_date: date = Field(..., description="تاريخ بداية الموسم YYYY-MM-DD")
    end_date: date = Field(..., description="تاريخ نهاية الموسم YYYY-MM-DD")
    is_active: bool = Field(default=True, description="حالة تفعيل الموسم")
    description: Optional[str] = Field(default=None, description="وصف مختصر للموسم")

    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info):
        start_date = info.data.get('start_date')
        if start_date and v <= start_date:
            raise ValueError('تاريخ نهاية الموسم يجب أن يكون بعد تاريخ البداية')
        return v


class SeasonUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class SeasonResponse(BaseModel):
    season_id: str
    name: str
    start_date: date
    end_date: date
    is_active: bool
    description: Optional[str] = None
    created_at: datetime

    model_config = {"extra": "ignore"}
