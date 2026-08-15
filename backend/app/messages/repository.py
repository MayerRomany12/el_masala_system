import secrets
from typing import Optional, List, Dict, Tuple, Any
from datetime import datetime, timezone

from sqlalchemy import select, update, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.internal_messages import InternalMessage, MessageRecipient
from app.models.user import User
from app.core.errors import AppException, NotFoundException


class MessagesRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_message(
        self,
        sender_id: str,
        recipient_id: Optional[str],
        subject: str,
        content: str,
        category: str = "Message",
        priority: str = "Normal"
    ) -> Dict[str, Any]:
        """
        إنشاء رسالة/مهمة ومزامنة تتبع القراءة الفردية في message_recipients
        """
        max_retries = 10
        for _ in range(max_retries):
            rand_num = secrets.randbelow(1_000_000)
            msg_id = f"MSG-{rand_num:06d}"

            new_msg = InternalMessage(
                message_id=msg_id,
                sender_id=sender_id,
                recipient_id=recipient_id,
                subject=subject,
                content=content,
                category=category,
                priority=priority,
                status="Pending"
            )
            self.db.add(new_msg)
            try:
                await self.db.flush()

                # Build MessageRecipient entries:
                # If recipient_id is specified -> single recipient entry
                # If recipient_id is None -> broadcast entry for all active users
                if recipient_id:
                    recip_entry_id = f"RCP-{secrets.randbelow(1_000_000):06d}"
                    self.db.add(MessageRecipient(
                        recipient_entry_id=recip_entry_id,
                        message_id=msg_id,
                        user_id=recipient_id,
                        is_read=False
                    ))
                else:
                    users_q = select(User.user_id).where(User.is_active == True)
                    user_ids = (await self.db.execute(users_q)).scalars().all()
                    for uid in user_ids:
                        recip_entry_id = f"RCP-{secrets.randbelow(1_000_000):06d}"
                        self.db.add(MessageRecipient(
                            recipient_entry_id=recip_entry_id,
                            message_id=msg_id,
                            user_id=uid,
                            is_read=False
                        ))
                await self.db.flush()
                return await self.get_message_by_id(msg_id, user_id=sender_id)
            except IntegrityError:
                await self.db.rollback()
                continue

        raise AppException(message="تعذر إنشاء الرسالة الداخلي، يرجى إعادة المحاولة")

    async def get_message_by_id(self, message_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        query = (
            select(
                InternalMessage,
                User.full_name.label("sender_name"),
                MessageRecipient.is_read,
                MessageRecipient.read_at
            )
            .outerjoin(User, InternalMessage.sender_id == User.user_id)
            .outerjoin(
                MessageRecipient,
                and_(
                    MessageRecipient.message_id == InternalMessage.message_id,
                    MessageRecipient.user_id == user_id
                )
            )
            .where(InternalMessage.message_id == message_id)
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            return None

        msg, sender_name, is_read, read_at = row
        return {
            "message_id": msg.message_id,
            "sender_id": msg.sender_id,
            "sender_name": sender_name or "النظام / السوبر أدمن",
            "recipient_id": msg.recipient_id,
            "subject": msg.subject,
            "content": msg.content,
            "category": msg.category,
            "priority": msg.priority,
            "status": msg.status,
            "is_read": bool(is_read) if is_read is not None else False,
            "read_at": read_at,
            "created_at": msg.created_at
        }

    async def get_inbox(self, user_id: str) -> List[Dict[str, Any]]:
        """
        جلب رسائل الوارد للمستخدم مع تتبع القراءة الفردية من message_recipients
        """
        query = (
            select(
                InternalMessage,
                User.full_name.label("sender_name"),
                MessageRecipient.is_read,
                MessageRecipient.read_at
            )
            .join(MessageRecipient, MessageRecipient.message_id == InternalMessage.message_id)
            .outerjoin(User, InternalMessage.sender_id == User.user_id)
            .where(MessageRecipient.user_id == user_id)
            .order_by(InternalMessage.created_at.desc())
        )
        res = await self.db.execute(query)
        rows = res.all()

        return [{
            "message_id": msg.message_id,
            "sender_id": msg.sender_id,
            "sender_name": sender_name or "النظام / السوبر أدمن",
            "recipient_id": msg.recipient_id,
            "subject": msg.subject,
            "content": msg.content,
            "category": msg.category,
            "priority": msg.priority,
            "status": msg.status,
            "is_read": bool(is_read),
            "read_at": read_at,
            "created_at": msg.created_at
        } for msg, sender_name, is_read, read_at in rows]

    async def get_sent(self, user_id: str) -> List[Dict[str, Any]]:
        query = (
            select(
                InternalMessage,
                User.full_name.label("recipient_name")
            )
            .outerjoin(User, InternalMessage.recipient_id == User.user_id)
            .where(InternalMessage.sender_id == user_id)
            .order_by(InternalMessage.created_at.desc())
        )
        res = await self.db.execute(query)
        rows = res.all()

        return [{
            "message_id": msg.message_id,
            "sender_id": msg.sender_id,
            "recipient_id": msg.recipient_id,
            "recipient_name": recipient_name or "عام (Broadcast)",
            "subject": msg.subject,
            "content": msg.content,
            "category": msg.category,
            "priority": msg.priority,
            "status": msg.status,
            "created_at": msg.created_at
        } for msg, recipient_name in rows]

    async def mark_as_read(self, message_id: str, user_id: str) -> bool:
        now = datetime.now(timezone.utc)
        res = await self.db.execute(
            update(MessageRecipient)
            .where(
                MessageRecipient.message_id == message_id,
                MessageRecipient.user_id == user_id
            )
            .values(is_read=True, read_at=now)
        )
        await self.db.flush()
        return res.rowcount > 0

    async def update_task_status(self, message_id: str, new_status: str) -> Optional[Dict[str, Any]]:
        await self.db.execute(
            update(InternalMessage)
            .where(InternalMessage.message_id == message_id)
            .values(status=new_status)
        )
        await self.db.flush()
        return await self.get_message_by_id(message_id, user_id="")

    async def get_unread_count(self, user_id: str) -> int:
        query = select(func.count(MessageRecipient.recipient_entry_id)).where(
            MessageRecipient.user_id == user_id,
            MessageRecipient.is_read == False
        )
        return (await self.db.execute(query)).scalar_one()
