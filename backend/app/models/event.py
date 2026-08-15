from sqlalchemy import Column, String, Date, Numeric, Text, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    event_id    = Column(String(20), primary_key=True, index=True)
    title       = Column(String(200), nullable=False, index=True)
    event_type  = Column(String(50), nullable=False, default="Meeting", index=True) # Meeting, Trip, Event
    event_date  = Column(Date, nullable=False, index=True)                           # Date type in PostgreSQL
    stage       = Column(String(100), nullable=False, default="ALL", index=True)     # Canonical stage code or "ALL"
    fee         = Column(Numeric(10, 2), nullable=False, default=0.00)
    is_free     = Column(Boolean, nullable=False, default=False)
    recurrence  = Column(String(30), nullable=False, default="OneTime")               # OneTime, Weekly, Monthly
    location    = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    status      = Column(String(20), nullable=False, default="Active", index=True)    # Active, Completed, Cancelled
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    registration_id            = Column(String(30), primary_key=True, index=True)
    event_id                   = Column(String(20), ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False, index=True)
    member_id                  = Column(String(10), ForeignKey("members.member_id", ondelete="RESTRICT"), nullable=False, index=True)
    attendance_discount_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    points_discount_amount     = Column(Numeric(10, 2), nullable=False, default=0.00)
    amount_due                 = Column(Numeric(10, 2), nullable=False, default=0.00)
    amount_paid                = Column(Numeric(10, 2), nullable=False, default=0.00)
    payment_status             = Column(String(20), nullable=False, default="Unpaid", index=True) # Unpaid, Partial, Paid
    notes                      = Column(Text, nullable=True)
    created_at                 = Column(DateTime(timezone=True), server_default=func.now())
    updated_at                 = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("event_id", "member_id", name="uq_event_member_registration"),
    )
