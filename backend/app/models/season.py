from sqlalchemy import Column, String, Date, Boolean, DateTime, CheckConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class Season(Base):
    __tablename__ = "seasons"

    season_id   = Column(String(30), primary_key=True, index=True)
    name        = Column(String(100), nullable=False, unique=True, index=True) # e.g. "2025/2026"
    start_date  = Column(Date, nullable=False)
    end_date    = Column(Date, nullable=False)
    is_active   = Column(Boolean, nullable=False, default=True, index=True)
    description = Column(String(255), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("start_date < end_date", name="chk_season_date_range"),
    )
