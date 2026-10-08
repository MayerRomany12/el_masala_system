from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission, get_servant_class_ids
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
    class_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:manage"))
):
    service = FollowupService(db)
    result = await service.run_absence_detector(stage=stage, class_id=class_id)
    return success_response(data=result, message=result["message"])


@router.get("/tasks/by-area", response_model=dict)
async def get_tasks_by_area(
    class_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:read"))
):
    allowed_class_ids = await get_servant_class_ids(current_user, db)
    if class_id and allowed_class_ids is not None and class_id not in allowed_class_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لعرض افتقاد هذا الفصل")

    service = FollowupService(db)
    result = await service.get_tasks_grouped_by_area(
        class_id=class_id,
        allowed_class_ids=allowed_class_ids,
        status=status
    )
    return success_response(data=result, message="تم تجميع مهام الافتقاد بحسب المناطق السكنية بنجاح")


@router.get("/tasks", response_model=dict)
async def list_followup_tasks(
    servant_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    class_id: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:read"))
):
    allowed_class_ids = await get_servant_class_ids(current_user, db)
    if class_id and allowed_class_ids is not None and class_id not in allowed_class_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لعرض افتقاد هذا الفصل")

    resolved_servant_id = servant_id
    if servant_id == "me" or servant_id == "@me":
        resolved_servant_id = current_user.get("user_id")

    service = FollowupService(db)
    result = await service.list_tasks(
        servant_id=resolved_servant_id, priority=priority, status=status, search=search,
        class_id=class_id, area=area, allowed_class_ids=allowed_class_ids,
        page=page, limit=limit
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

    try:
        from app.audit.service import AuditService
        audit_svc = AuditService(db)
        await audit_svc.log_event(
            action="CREATE_FOLLOWUP_TASK",
            resource_type="Followup",
            resource_id=task.get("task_id"),
            current_user=current_user,
            details=f"قام بإنشاء مهمة افتقاد للطفل {task_in.member_id}"
        )
    except Exception:
        pass

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

    try:
        from app.audit.service import AuditService
        audit_svc = AuditService(db)
        await audit_svc.log_event(
            action="LOG_FOLLOWUP",
            resource_type="Followup",
            resource_id=task_id,
            current_user=current_user,
            details=f"قام بتوثيق نتيجة افتقاد ({log_in.contact_method} - النتيجة: {log_in.outcome}) للمهمة {task_id}"
        )
    except Exception:
        pass

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


@router.post("/classes/{class_id}/distribute", response_model=dict)
async def distribute_class_followup_tasks(
    class_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:write"))
):
    allowed_class_ids = await get_servant_class_ids(current_user, db)
    if allowed_class_ids is not None and class_id not in allowed_class_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لتوزيع مهام افتقاد هذا الفصل")

    service = FollowupService(db)
    result = await service.distribute_class_tasks(class_id)

    try:
        from app.audit.service import AuditService
        audit_svc = AuditService(db)
        await audit_svc.log_event(
            action="DISTRIBUTE_FOLLOWUP",
            resource_type="Followup",
            resource_id=class_id,
            current_user=current_user,
            details=f"قام بتوزيع {result.get('total_tasks', 0)} مهمة افتقاد لفصل '{result.get('class_name', class_id)}' بالتساوي على {result.get('servants_count', 0)} من خدام الفصل"
        )
    except Exception:
        pass

    return success_response(data=result, message=f"تم توزيع مهام الافتقاد على خدام الفصل بنجاح")


@router.post("/classes/{class_id}/detect-and-distribute", response_model=dict)
async def detect_and_distribute_class_tasks(
    class_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:write"))
):
    allowed_class_ids = await get_servant_class_ids(current_user, db)
    if allowed_class_ids is not None and class_id not in allowed_class_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لتوزيع مهام افتقاد هذا الفصل")

    service = FollowupService(db)
    result = await service.detect_and_distribute_class(class_id)

    try:
        from app.audit.service import AuditService
        audit_svc = AuditService(db)
        await audit_svc.log_event(
            action="AUTO_DISTRIBUTE_FOLLOWUP",
            resource_type="Followup",
            resource_id=class_id,
            current_user=current_user,
            details=f"قام بكشف الغياب والتوزيع الآلي لـ {result.get('total_tasks', 0)} مهمة افتقاد لفصل {class_id} بالتساوي على {result.get('servants_count', 0)} من خدام الفصل"
        )
    except Exception:
        pass

    return success_response(data=result, message=result.get("message", "تم كشف وتوزيع مهام الافتقاد بنجاح"))


@router.get("/classes/{class_id}/stats", response_model=dict)
async def get_class_followup_stats(
    class_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("followup:read"))
):
    allowed_class_ids = await get_servant_class_ids(current_user, db)
    if allowed_class_ids is not None and class_id not in allowed_class_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لعرض إحصائيات افتقاد هذا الفصل")

    service = FollowupService(db)
    result = await service.get_class_followup_stats(class_id)
    return success_response(data=result, message="تم جلب إحصائيات متابعة افتقاد الفصل بنجاح")

