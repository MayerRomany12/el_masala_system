from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class ClassGroup(Base):
    __tablename__ = "class_groups"

    class_id    = Column(String(30), primary_key=True, index=True)
    name        = Column(String(200), nullable=False, index=True)
    group_type  = Column(String(50), nullable=False, default="Standard", index=True) # Standard, Summer, Ministry, Other
    season_id   = Column(String(30), ForeignKey("seasons.season_id", ondelete="SET NULL"), nullable=True, index=True)
    stage       = Column(String(100), nullable=False, default="ALL", index=True)
    description = Column(Text, nullable=True)
    status      = Column(String(20), nullable=False, default="Active", index=True) # Active, Inactive, Archived
    created_by  = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ClassGroupServant(Base):
    __tablename__ = "class_group_servants"

    assignment_id = Column(String(30), primary_key=True, index=True)
    class_id      = Column(String(30), ForeignKey("class_groups.class_id", ondelete="CASCADE"), nullable=False, index=True)
    servant_id    = Column(String(50), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    role          = Column(String(50), nullable=False, default="Servant") # LeadServant, Servant
    joined_at     = Column(DateTime(timezone=True), server_default=func.now())
    left_at       = Column(DateTime(timezone=True), nullable=True)
    assigned_by   = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    is_active     = Column(Boolean, nullable=False, default=True, index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class ClassGroupMember(Base):
    __tablename__ = "class_group_members"

    membership_id = Column(String(30), primary_key=True, index=True)
    class_id      = Column(String(30), ForeignKey("class_groups.class_id", ondelete="CASCADE"), nullable=False, index=True)
    member_id     = Column(String(10), ForeignKey("members.member_id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at     = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    left_at       = Column(DateTime(timezone=True), nullable=True)
    is_active     = Column(Boolean, nullable=False, default=True, index=True)
    created_by    = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
