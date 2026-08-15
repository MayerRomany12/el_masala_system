from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MemberStatusEnum:
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    ARCHIVED = "Archived"

class GenderEnum:
    MALE = "ذكر"
    FEMALE = "أنثى"

class MemberBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="الاسم الثلاثي أو الرباعي للطفل")
    gender: str = Field(default=GenderEnum.MALE, description="الجنس (ذكر / أنثى)")
    date_of_birth: Optional[str] = Field(default=None, description="تاريخ الميلاد YYYY-MM-DD")
    stage: str = Field(..., description="المرحلة الخدمية/الدراسية")
    group_name: Optional[str] = Field(default=None, description="اسم أسرة الخادم / الفصل / المجموعة")
    phone: str = Field(..., description="رقم تليفون ولي الأمر الرئيسي")
    whatsapp_phone: Optional[str] = Field(default=None, description="رقم واتساب المتابعة")
    father_of_confession: Optional[str] = Field(default=None, description="اسم أب الاعتراف")
    address: Optional[str] = Field(default=None, description="عنوان السكن")
    notes: Optional[str] = Field(default=None, description="ملاحظات خادمة أو صحية")
    status: str = Field(default=MemberStatusEnum.ACTIVE, description="حالة الحساب (Active, Inactive, Archived)")

    model_config = {"extra": "ignore"}

class MemberCreate(MemberBase):
    pass

class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    stage: Optional[str] = None
    group_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    father_of_confession: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class MemberStatusUpdate(BaseModel):
    status: str = Field(..., description="الحالة الجديدة (Active, Inactive, Archived)")

class MemberResponse(MemberBase):
    member_id: str = Field(..., description="رمز العضوية الفريد الدائم صيغة K-XXXXXX")
    qr_token: Optional[str] = Field(default=None, description="QR Token الأولي — Opaque Random Token")
    card_issued_at: Optional[datetime] = Field(default=None, description="تاريخ إصدار البطاقة")
    created_at: datetime
    updated_at: Optional[datetime] = None

class MemberListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[MemberResponse]

# ─── M3: QR & Card Schemas ────────────────────────────────────────────────────

class CardPayload(BaseModel):
    """ما يُرسَل من الفرونت عند مسح QR — Token أولي بدون بيانات شخصية."""
    token: str = Field(..., description="QR Token الأولي")

class ScanResponse(BaseModel):
    """بيانات المخدوم التي يُرجعها الباك إند بعد التحقق من الـ Token."""
    member_id: str
    full_name: str
    gender: str
    stage: str
    group_name: Optional[str] = None
    phone: str
    date_of_birth: Optional[str] = None
    status: str
    card_issued_at: Optional[datetime] = None
