from fastapi import APIRouter, Depends, Query, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.messages.schemas import MessageCreate, TaskStatusUpdate
from app.messages.service import MessagesService
from app.shared.response import success_response

router = APIRouter(prefix="/messages", tags=["Internal Messaging & Servant Task Center"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def send_message(
    msg_in: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("messages:send"))
):
    service = MessagesService(db)
    new_msg = await service.send_message(msg_in, current_user.get("user_id"))
    return success_response(data=new_msg, message="تم إرسال الرسالة/المهمة بنجاح ✉️")


@router.get("/inbox", response_model=dict)
async def get_inbox(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = MessagesService(db)
    items = await service.get_inbox(current_user.get("user_id"))
    return success_response(data={"items": items, "total": len(items)}, message="تم جلب صندوق الوارد بنجاح")


@router.get("/sent", response_model=dict)
async def get_sent(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = MessagesService(db)
    items = await service.get_sent(current_user.get("user_id"))
    return success_response(data={"items": items, "total": len(items)}, message="تم جلب الرسائل المرسلة بنجاح")


@router.patch("/{message_id}/read", response_model=dict)
async def mark_as_read(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = MessagesService(db)
    result = await service.mark_as_read(message_id, current_user.get("user_id"))
    return success_response(data=result, message="تم تحديد الرسالة كـ مقروءة")


@router.patch("/{message_id}/status", response_model=dict)
async def update_task_status(
    message_id: str,
    status_in: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("messages:send"))
):
    service = MessagesService(db)
    updated = await service.update_task_status(message_id, status_in.status)
    return success_response(data=updated, message=f"تم تحديث حالة المهمة إلى {status_in.status}")


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = MessagesService(db)
    count = await service.get_unread_count(current_user.get("user_id"))
    return success_response(data={"unread_count": count}, message="تم جلب عدّاد الرسائل غير المقروءة")
