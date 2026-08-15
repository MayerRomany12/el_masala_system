from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.followup.repository import FollowupRepository
from app.members.repository import MemberRepository
from app.followup.schemas import (
    FollowupTaskCreate,
    FollowupTaskUpdate,
    FollowupLogCreate,
    AbsenceDetectorResponse
)
from app.core.errors import NotFoundException, BadRequestException


class FollowupService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = FollowupRepository(db)
        self.member_repo = MemberRepository(db)

    async def run_absence_detector(self, stage: Optional[str] = None) -> Dict[str, Any]:
        return await self.repo.run_absence_detector(stage=stage)

    async def list_tasks(
        self,
        servant_id: Optional[str] = None,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        page = max(1, page)
        limit = min(100, max(1, limit))
        skip = (page - 1) * limit

        items, total = await self.repo.get_tasks(
            servant_id=servant_id, priority=priority, status=status, search=search, skip=skip, limit=limit
        )
        return {"total": total, "page": page, "limit": limit, "items": items}

    async def get_task_by_id(self, task_id: str) -> Dict[str, Any]:
        task = await self.repo.get_task_by_id(task_id)
        if not task:
            raise NotFoundException(f"مهمة الافتقاد برقم {task_id} غير موجودة")
        return task

    async def create_manual_task(self, data: FollowupTaskCreate) -> Dict[str, Any]:
        member = await self.member_repo.get_by_member_id(data.member_id)
        if not member:
            raise NotFoundException(f"المخدوم برقم العضوية {data.member_id} غير موجود")

        if member["status"] != "Active":
            raise BadRequestException("يمكن فقط متابعة وافتفاد الأطفال النشطين بالنظام")

        consecutive, last_session_id = await self.repo.calculate_consecutive_absences_for_member(data.member_id, member["stage"])
        consecutive = max(1, consecutive)

        task, _ = await self.repo.upsert_followup_task(
            member_id=data.member_id,
            consecutive_weeks=consecutive,
            last_absence_session_id=last_session_id,
            priority=data.priority or "Normal",
            assigned_servant_id=data.assigned_servant_id
        )
        return task

    async def update_task(self, task_id: str, data: FollowupTaskUpdate) -> Dict[str, Any]:
        task = await self.repo.get_task_by_id(task_id)
        if not task:
            raise NotFoundException(f"مهمة الافتقاد برقم {task_id} غير موجودة")

        update_fields = data.model_dump(exclude_unset=True)
        if not update_fields:
            return task

        return await self.repo.update_task(task_id, update_fields)

    async def log_followup(self, task_id: str, data: FollowupLogCreate, current_user_id: str) -> Dict[str, Any]:
        task = await self.repo.get_task_by_id(task_id)
        if not task:
            raise NotFoundException(f"مهمة الافتقاد برقم {task_id} غير موجودة")

        return await self.repo.create_followup_log(
            task_id=task_id,
            servant_id=current_user_id,
            contact_method=data.contact_method,
            outcome=data.outcome,
            notes=data.notes
        )

    async def escalate_task(self, task_id: str) -> Dict[str, Any]:
        task = await self.repo.get_task_by_id(task_id)
        if not task:
            raise NotFoundException(f"مهمة الافتقاد برقم {task_id} غير موجودة")

        return await self.repo.update_task(task_id, {"status": "Escalated", "priority": "Urgent"})
