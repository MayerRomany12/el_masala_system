from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ClassGroupCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="اسم الفصل أو المجموعة (مثال: فصل أولي وثانية ابتدائي)")
    group_type: str = Field(default="Regular", description="نوع المجموعة: Regular (فصل خدمي) أو Summer (نشاط صيفي)")
    season_id: Optional[str] = Field(default=None, description="كود الموسم الخدمي المرتبط")
    stage: Optional[str] = Field(default=None, description="المرحلة الدراسية")
    educational_year: Optional[str] = Field(default=None, description="السنة الدراسية (مثال: الصف الأول الابتدائي)")
    description: Optional[str] = Field(default=None, description="وصف مختصر للمجموعة")
    is_active: bool = Field(default=True, description="حالة التفعيل")


class ClassGroupUpdate(BaseModel):
    name: Optional[str] = None
    group_type: Optional[str] = None
    season_id: Optional[str] = None
    stage: Optional[str] = None
    educational_year: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ClassGroupResponse(BaseModel):
    class_id: str
    name: str
    group_type: str
    season_id: Optional[str] = None
    season_name: Optional[str] = None
    stage: Optional[str] = None
    educational_year: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    active_servants_count: int = 0
    active_members_count: int = 0
    created_at: datetime

    model_config = {"extra": "ignore"}


class AssignServantRequest(BaseModel):
    servant_id: str = Field(..., description="كود خادم الكنيسة / المستخدم")
    role: str = Field(default="Servant", description="دور الخادم في الفصل: LeadServant (أمين فصل) أو Servant (خادم)")


class AddMemberRequest(BaseModel):
    member_id: str = Field(..., description="كود المخدوم / الطفل")


class TransferMemberRequest(BaseModel):
    from_class_id: str = Field(..., description="كود الفصل الحالي")
    to_class_id: str = Field(..., description="كود الفصل الجديد المراد الانتقال إليه")
    member_id: str = Field(..., description="كود المخدوم / الطفل")
