from sqlalchemy import Column, String, Date, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class FollowupTask(Base):
    __tablename__ = "followup_tasks"

    task_id                 = Column(String(30), primary_key=True, index=True)
    member_id               = Column(String(10), ForeignKey("members.member_id", ondelete="RESTRICT"), nullable=False, index=True)
    last_absence_session_id = Column(String(30), ForeignKey("attendance_sessions.session_id", ondelete="SET NULL"), nullable=True)
    consecutive_weeks       = Column(Integer, nullable=False, default=1)
    assigned_servant_id     = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    status                  = Column(String(20), nullable=False, default="Pending", index=True) # Pending, Completed, Escalated, Cancelled
    priority                = Column(String(20), nullable=False, default="Normal", index=True)  # Normal, High, Urgent
    due_date                = Column(Date, nullable=True)
    last_detected_at        = Column(DateTime(timezone=True), server_default=func.now())
    created_at              = Column(DateTime(timezone=True), server_default=func.now())
    updated_at              = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FollowupLog(Base):
    __tablename__ = "followup_logs"

    log_id         = Column(String(30), primary_key=True, index=True)
    task_id        = Column(String(30), ForeignKey("followup_tasks.task_id", ondelete="CASCADE"), nullable=False, index=True)
    servant_id     = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    contact_method = Column(String(30), nullable=False) # Phone, Visit, WhatsApp, Church
    outcome        = Column(String(50), nullable=False) # Promised, Sick, Traveling, Family_Reason, No_Response
    notes          = Column(Text, nullable=True)
    logged_at      = Column(DateTime(timezone=True), server_default=func.now())
