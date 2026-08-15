from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class PointsTransaction(Base):
    __tablename__ = "points_transactions"

    transaction_id = Column(String(30), primary_key=True, index=True)
    member_id      = Column(String(10), ForeignKey("members.member_id", ondelete="RESTRICT"), nullable=False, index=True)
    points         = Column(Integer, nullable=False) # Positive (Earned/Bonus) or Negative (Redeemed)
    type           = Column(String(20), nullable=False, index=True) # Earned, Redeemed, Bonus
    event_id       = Column(String(20), ForeignKey("events.event_id", ondelete="SET NULL"), nullable=True, index=True)
    session_id     = Column(String(30), ForeignKey("attendance_sessions.session_id", ondelete="SET NULL"), nullable=True, index=True)
    reason         = Column(String(250), nullable=False)
    created_by     = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), index=True)
