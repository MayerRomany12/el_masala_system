from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key         = Column(String(50), primary_key=True, index=True)
    value       = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
