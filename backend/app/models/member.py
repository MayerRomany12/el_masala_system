from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Date
from sqlalchemy.sql import func
from app.core.database import Base


class Member(Base):
    __tablename__ = "members"

    # K-XXXXXX  ← رمز العضوية الفريد الدائم
    member_id            = Column(String(10),  primary_key=True, index=True)
    full_name            = Column(String(200), nullable=False, index=True)
    gender               = Column(String(10),  nullable=False, default="ذكر")
    date_of_birth        = Column(Date,        nullable=True)  # Native PostgreSQL DATE
    stage                = Column(String(100), nullable=False, index=True) # Canonical Stage Code or String
    group_name           = Column(String(200), nullable=True)
    phone                = Column(String(30),  nullable=False)
    whatsapp_phone       = Column(String(30),  nullable=True)
    father_of_confession = Column(String(200), nullable=True)
    address              = Column(Text, nullable=True)
    notes                = Column(Text, nullable=True)
    status               = Column(String(20),  nullable=False, default="Active", index=True)
    qr_token             = Column(String(64),  unique=True, nullable=True, index=True)
    card_issued_at       = Column(DateTime(timezone=True), nullable=True)
    total_points         = Column(Integer, nullable=False, default=0, index=True)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
