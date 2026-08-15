from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class MessageCreate(BaseModel):
    recipient_id: Optional[str] = Field(None, description="رمز المستخدم المستلم أو NULL للإذاعة العامة Broadcast")
    subject: str = Field(..., min_length=2, max_length=200, description="عنوان الرسالة/المهمة")
    content: str = Field(..., min_length=2, description="محتوى الرسالة والملاحظات")
    category: str = Field("Message", description="Message, Task, Note, Escalation")
    priority: str = Field("Normal", description="Normal, High, Urgent")


class TaskStatusUpdate(BaseModel):
    status: str = Field(..., description="Pending, In_Progress, Completed")
