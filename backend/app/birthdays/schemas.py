from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class PeriodEnum:
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    ALL = "all"


class GiftDeliverRequest(BaseModel):
    member_id: str = Field(..., description="رمز العضوية K-XXXXXX")
    gift_name: str = Field(..., min_length=2, description="اسم/نوع الهدية (مثال: كتاب مقدس + لعبة)")
    notes: Optional[str] = Field(None, description="ملاحظات التسليم")


class GiftDeliveryResponse(BaseModel):
    delivery_id: str
    member_id: str
    year: int
    gift_name: str
    notes: Optional[str] = None
    delivered_by_name: Optional[str] = None
    delivered_at: datetime


class BirthdayMemberItem(BaseModel):
    member_id: str
    full_name: str
    stage: str
    date_of_birth: Optional[str] = None  # String field as stored in Member model
    age: int
    phone: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    birthday_day: int
    birthday_month: int
    gift_status: str  # "Delivered" or "Pending"
    gift_delivery_info: Optional[Dict[str, Any]] = None
