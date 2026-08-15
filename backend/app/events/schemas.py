from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class EventTypeEnum:
    MEETING = "Meeting"
    TRIP = "Trip"
    EVENT = "Event"


class EventStatusEnum:
    ACTIVE = "Active"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class PaymentStatusEnum:
    UNPAID = "Unpaid"
    PARTIAL = "Partial"
    PAID = "Paid"


# ─── Event Schemas ────────────────────────────────────────────────────────────

class EventBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200, description="اسم الفعالية / الرحلة")
    event_type: str = Field(default=EventTypeEnum.MEETING, description="نوع الفعالية (Meeting, Trip, Event)")
    event_date: str = Field(..., description="تاريخ الفعالية بصيغة YYYY-MM-DD")
    stage: str = Field(default="ALL", description="المرحلة المستهدفة أو ALL لجميع المراحل")
    fee: float = Field(default=0.0, ge=0.0, description="الاشتراك المطلوب للفعالية (0 للاجتماعات)")
    is_free: bool = Field(default=False, description="فعالية مجانية 🎁")
    recurrence: str = Field(default="OneTime", description="نوع وتكرار الفعالية: OneTime, Weekly, Monthly")
    location: Optional[str] = Field(default=None, description="المكان / الوجهة")
    description: Optional[str] = Field(default=None, description="وصف إضافي للفعالية")
    status: str = Field(default=EventStatusEnum.ACTIVE, description="حالة الفعالية (Active, Completed, Cancelled)")

    model_config = {"extra": "ignore"}


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    stage: Optional[str] = None
    fee: Optional[float] = None
    is_free: Optional[bool] = None
    recurrence: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class EventResponse(EventBase):
    event_id: str
    participants_count: int = 0
    total_collected: float = 0.0
    total_due: float = 0.0
    total_remaining: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None


# ─── Event Registration & Payment Schemas ─────────────────────────────────────

class EventRegistrationCreate(BaseModel):
    member_id: str = Field(..., description="رمز العضوية الفريد للطفل صيغة K-XXXXXX")
    amount_due: Optional[float] = Field(default=None, ge=0.0, description="المبلغ المستحق (اختياري - افتراضياً رسوم الفعالية)")
    amount_paid: float = Field(default=0.0, ge=0.0, description="المبلغ المدفوع عند التسجيل")
    notes: Optional[str] = Field(default=None, description="ملاحظات التسجيل أو السداد")


class EventRegistrationPaymentUpdate(BaseModel):
    amount_paid: float = Field(..., ge=0.0, description="المبلغ الإجمالي المدفوع حتى الآن")
    notes: Optional[str] = Field(default=None, description="ملاحظات إضافية")


class EventRegistrationResponse(BaseModel):
    registration_id: str
    event_id: str
    member_id: str
    member_name: Optional[str] = None
    member_stage: Optional[str] = None
    member_phone: Optional[str] = None
    amount_due: float
    amount_paid: float
    remaining_amount: float
    payment_status: str  # Unpaid, Partial, Paid
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
