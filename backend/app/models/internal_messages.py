from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class InternalMessage(Base):
    __tablename__ = "internal_messages"

    message_id   = Column(String(30), primary_key=True, index=True)
    sender_id    = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    recipient_id = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True) # NULL = Broadcast / General Announcement
    subject      = Column(String(200), nullable=False)
    content      = Column(Text, nullable=False)
    category     = Column(String(30), nullable=False, default="Message", index=True)  # Message, Task, Note, Escalation
    priority     = Column(String(20), nullable=False, default="Normal", index=True)   # Normal, High, Urgent
    status       = Column(String(20), nullable=False, default="Pending", index=True)  # Applicable to Task (Pending, In_Progress, Completed)
    created_at   = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class MessageRecipient(Base):
    """Per-user read tracking table for individual and broadcast messages."""
    __tablename__ = "message_recipients"

    recipient_entry_id = Column(String(30), primary_key=True, index=True)
    message_id         = Column(String(30), ForeignKey("internal_messages.message_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id            = Column(String(50), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    is_read            = Column(Boolean, nullable=False, default=False, index=True)
    read_at            = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_recipient_user"),
    )
