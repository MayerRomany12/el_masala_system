from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.followup.schemas import (
    FollowupTaskCreate,
    FollowupTaskUpdate,
    FollowupLogCreate
)
from app.followup.service import FollowupService
from app.shared.response import success_response

router = APIRouter(prefix="/followup", tags=["Absence Tracking & Servant Follow-Up System"])


@router.post("/detect", response_model=dict)
async def run_absence_detector(
    stage: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:manage"))
):
    service = FollowupService(db)
    result = await service.run_absence_detector(stage=stage)
    return success_response(data=result, message=result["message"])


@router.get("/tasks", response_model=dict)
async def list_followup_tasks(
    servant_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:read"))
):
    service = FollowupService(db)
    result = await service.list_tasks(
        servant_id=servant_id, priority=priority, status=status, search=search, page=page, limit=limit
    )
    return success_response(data=result, message="تم جلب قائمة مهام الافتقاد بنجاح")


@router.post("/tasks", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_manual_task(
    task_in: FollowupTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:manage"))
):
    service = FollowupService(db)
    task = await service.create_manual_task(task_in)
    return success_response(data=task, message=f"تم إنشاء مهمة الافتقاد بنجاح بالرمز {task['task_id']}")


@router.get("/tasks/{task_id}", response_model=dict)
async def get_task_by_id(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:read"))
):
    service = FollowupService(db)
    task = await service.get_task_by_id(task_id)
    return success_response(data=task, message="تم جلب تفاصيل مهمة الافتقاد")


@router.put("/tasks/{task_id}", response_model=dict)
async def update_task(
    task_id: str,
    update_in: FollowupTaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:manage"))
):
    service = FollowupService(db)
    updated = await service.update_task(task_id, update_in)
    return success_response(data=updated, message="تم تحديث بيانات مهمة الافتقاد")


@router.post("/tasks/{task_id}/log", response_model=dict, status_code=status.HTTP_201_CREATED)
async def log_followup(
    task_id: str,
    log_in: FollowupLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:read"))
):
    service = FollowupService(db)
    updated_task = await service.log_followup(
        task_id=task_id,
        data=log_in,
        current_user_id=current_user.get("user_id")
    )
    return success_response(data=updated_task, message="تم توثيق نتيجة الافتقاد بنجاح 📝")


@router.get("/tasks/{task_id}/logs", response_model=dict)
async def get_task_logs(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:read"))
):
    service = FollowupService(db)
    logs = await service.repo.get_task_logs(task_id)
    return success_response(data=logs, message="تم جلب سجلات افتقاد الطفل")


@router.patch("/tasks/{task_id}/escalate", response_model=dict)
async def escalate_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:manage"))
):
    service = FollowupService(db)
    escalated = await service.escalate_task(task_id)
    return success_response(data=escalated, message="تم تصعيد مهمة الافتقاد لأمين الخدمة")
