from sqlalchemy import Column, String, Date, Boolean, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class AuthorizedDevice(Base):
    __tablename__ = "authorized_devices"

    device_id     = Column(String(30), primary_key=True, index=True)
    device_name   = Column(String(100), nullable=False)
    device_token  = Column(String(64), unique=True, nullable=False, index=True)
    registered_by = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    is_active     = Column(Boolean, nullable=False, default=True)
    last_used_at  = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    session_id   = Column(String(30), primary_key=True, index=True)
    event_id     = Column(String(20), ForeignKey("events.event_id", ondelete="SET NULL"), nullable=True, index=True)
    session_date = Column(Date, nullable=False, index=True)
    title        = Column(String(200), nullable=False)
    stage        = Column(String(100), nullable=False, default="ALL", index=True)
    recurrence   = Column(String(30), nullable=False, default="Weekly", index=True) # Daily, Weekly, Monthly, OneTime
    created_by   = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    status       = Column(String(20), nullable=False, default="Open", index=True) # Open, Closed
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AttendanceSessionServant(Base):
    __tablename__ = "attendance_session_servants"

    session_id = Column(String(30), ForeignKey("attendance_sessions.session_id", ondelete="CASCADE"), primary_key=True)
    user_id    = Column(String(50), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    record_id           = Column(String(30), primary_key=True, index=True)
    session_id          = Column(String(30), ForeignKey("attendance_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    member_id           = Column(String(10), ForeignKey("members.member_id", ondelete="RESTRICT"), nullable=False, index=True)
    scanned_by_user     = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    scanned_device_id   = Column(String(30), ForeignKey("authorized_devices.device_id", ondelete="SET NULL"), nullable=True)
    method              = Column(String(20), nullable=False, default="QR") # QR, Manual
    status              = Column(String(20), nullable=False, default="Valid", index=True) # Valid, Cancelled
    cancelled_by        = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    cancelled_at        = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    scanned_at          = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("session_id", "member_id", name="uq_session_member_attendance"),
    )
