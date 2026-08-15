from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.messages.repository import MessagesRepository
from app.messages.schemas import MessageCreate, TaskStatusUpdate
from app.core.errors import NotFoundException, BadRequestException


class MessagesService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MessagesRepository(db)

    async def send_message(self, data: MessageCreate, sender_id: str) -> Dict[str, Any]:
        valid_categories = ["Message", "Task", "Note", "Escalation"]
        if data.category not in valid_categories:
            raise BadRequestException(f"فئة الرسالة غير صالحة. الفئات المسموحة: {', '.join(valid_categories)}")

        return await self.repo.create_message(
            sender_id=sender_id,
            recipient_id=data.recipient_id,
            subject=data.subject,
            content=data.content,
            category=data.category,
            priority=data.priority
        )

    async def get_inbox(self, user_id: str) -> List[Dict[str, Any]]:
        return await self.repo.get_inbox(user_id)

    async def get_sent(self, user_id: str) -> List[Dict[str, Any]]:
        return await self.repo.get_sent(user_id)

    async def mark_as_read(self, message_id: str, user_id: str) -> Dict[str, Any]:
        success = await self.repo.mark_as_read(message_id, user_id)
        if not success:
            raise NotFoundException(f"الرسالة برقم {message_id} غير موجودة لدى المستخدم")
        return {"message_id": message_id, "is_read": True}

    async def update_task_status(self, message_id: str, new_status: str) -> Dict[str, Any]:
        valid_statuses = ["Pending", "In_Progress", "Completed"]
        if new_status not in valid_statuses:
            raise BadRequestException(f"حالة المهمة غير صالحة. الحالات المسموحة: {', '.join(valid_statuses)}")

        updated = await self.repo.update_task_status(message_id, new_status)
        if not updated:
            raise NotFoundException(f"المهمة برقم {message_id} غير موجودة")
        return updated

    async def get_unread_count(self, user_id: str) -> int:
        return await self.repo.get_unread_count(user_id)
