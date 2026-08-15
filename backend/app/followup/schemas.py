from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class ContactMethodEnum:
    PHONE = "Phone"
    VISIT = "Visit"
    WHATSAPP = "WhatsApp"
    CHURCH = "Church"


class OutcomeEnum:
    PROMISED = "Promised"
    SICK = "Sick"
    TRAVELING = "Traveling"
    FAMILY_REASON = "Family_Reason"
    NO_RESPONSE = "No_Response"


class TaskStatusEnum:
    PENDING = "Pending"
    COMPLETED = "Completed"
    ESCALATED = "Escalated"
    CANCELLED = "Cancelled"


class TaskPriorityEnum:
    NORMAL = "Normal"
    HIGH = "High"
    URGENT = "Urgent"


# ─── Task & Log Schemas ───────────────────────────────────────────────────────

class FollowupTaskCreate(BaseModel):
    member_id: str = Field(..., description="رمز العضوية K-XXXXXX للطفل الغائب")
    assigned_servant_id: Optional[str] = Field(default=None, description="رمز الخادم المكلف بالافتفاد")
    priority: Optional[str] = Field(default="Normal", description="الأولوية (Normal, High, Urgent)")
    due_date: Optional[str] = Field(default=None, description="تاريخ استحقاق الافتقاد YYYY-MM-DD")


class FollowupTaskUpdate(BaseModel):
    assigned_servant_id: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


class FollowupLogCreate(BaseModel):
    contact_method: str = Field(..., description="وسيلة التواصل (Phone, Visit, WhatsApp, Church)")
    outcome: str = Field(..., description="نتيجة الافتقاد (Promised, Sick, Traveling, Family_Reason, No_Response)")
    notes: Optional[str] = Field(default=None, description="ملاحظات وتفاصيل الافتقاد")


class FollowupLogResponse(BaseModel):
    log_id: str
    task_id: str
    servant_id: Optional[str] = None
    servant_name: Optional[str] = None
    contact_method: str
    outcome: str
    notes: Optional[str] = None
    logged_at: datetime


class FollowupTaskResponse(BaseModel):
    task_id: str
    member_id: str
    member_name: Optional[str] = None
    member_stage: Optional[str] = None
    member_phone: Optional[str] = None
    last_absence_session_id: Optional[str] = None
    consecutive_weeks: int = 1
    assigned_servant_id: Optional[str] = None
    assigned_servant_name: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[str] = None
    last_detected_at: datetime
    created_at: datetime
    recent_logs: List[FollowupLogResponse] = []


class AbsenceDetectorResponse(BaseModel):
    detected_count: int
    tasks_created: int
    tasks_updated: int
    message: str
