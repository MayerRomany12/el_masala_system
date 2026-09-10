from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id        = Column(String(30), primary_key=True, index=True)
    user_id       = Column(String(50), nullable=True, index=True)
    user_name     = Column(String(100), nullable=True)
    action        = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id   = Column(String(50), nullable=True, index=True)
    old_values    = Column(JSON, nullable=True)
    new_values    = Column(JSON, nullable=True)
    details       = Column(Text, nullable=True)
    ip_address    = Column(String(50), nullable=True)
    user_agent    = Column(String(200), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), index=True)
