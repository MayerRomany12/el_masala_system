from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# ─── Device Schemas ───────────────────────────────────────────────────────────

class AuthorizedDeviceCreate(BaseModel):
    device_name: str = Field(..., min_length=2, max_length=100, description="اسم الجهاز المصرح له (مثال: تابلت 1)")

class AuthorizedDeviceResponse(BaseModel):
    device_id: str
    device_name: str
    device_token: str
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime


# ─── Attendance Session Schemas ───────────────────────────────────────────────

class AttendanceSessionCreate(BaseModel):
    event_id: Optional[str] = Field(default=None, description="رمز الفعالية المربوطة (اختياري)")
    session_date: str = Field(..., description="تاريخ الجلسة YYYY-MM-DD")
    title: str = Field(..., min_length=2, max_length=200, description="اسم الجلسة (مثال: حضور اجتماع الأحد 15 أغسطس)")
    stage: str = Field(default="ALL", description="المرحلة المستهدفة للجلسة أو ALL")
    recurrence: str = Field(default="Weekly", description="نوع وتكرار الجلسة: Daily, Weekly, Monthly, OneTime")
    authorized_user_ids: List[str] = Field(default=[], description="قائمة تعيين الخدام المصرح لهم بهذه الجلسة")

    model_config = {"extra": "ignore"}


class AttendanceSessionRecurrenceUpdate(BaseModel):
    recurrence: str = Field(..., description="نوع التكرار الجديد: Daily, Weekly, Monthly, OneTime")


class AttendanceSessionResponse(BaseModel):
    session_id: str
    event_id: Optional[str] = None
    session_date: str
    title: str
    stage: str
    recurrence: str # Daily, Weekly, Monthly, OneTime
    status: str # Open, Closed
    created_by: Optional[str] = None
    authorized_user_ids: List[str] = []
    present_count: int = 0
    targeted_count: int = 0
    attendance_percentage: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None


# ─── Attendance Scan & Record Schemas ─────────────────────────────────────────

class AttendanceScanRequest(BaseModel):
    session_id: str = Field(..., description="رمز جلسة الحضور المفتوحة")
    token_or_id: str = Field(..., description="QR Token أو رمز العضوية K-XXXXXX أو اسم الطفل")
    method: str = Field(default="QR", description="طريقة التسجيل (QR أو Manual)")


class AttendanceCancelRequest(BaseModel):
    cancellation_reason: str = Field(..., min_length=2, description="سبب تصحيح/إلغاء الحضور")


class AttendanceRecordResponse(BaseModel):
    record_id: str
    session_id: str
    member_id: str
    member_name: Optional[str] = None
    member_stage: Optional[str] = None
    scanned_by_user: Optional[str] = None
    scanned_by_name: Optional[str] = None
    scanned_device_name: Optional[str] = None
    method: str
    status: str # Valid, Cancelled
    cancelled_by_name: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    scanned_at: datetime
