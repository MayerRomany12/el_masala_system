from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class BirthdayGiftDelivery(Base):
    __tablename__ = "birthday_gift_deliveries"

    delivery_id  = Column(String(30), primary_key=True, index=True)
    member_id    = Column(String(10), ForeignKey("members.member_id", ondelete="RESTRICT"), nullable=False, index=True)
    year         = Column(Integer, nullable=False, index=True) # E.g. 2026
    gift_name    = Column(String(150), nullable=False)
    notes        = Column(String(250), nullable=True)
    delivered_by = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    delivered_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint("member_id", "year", name="uq_member_year"),
    )
