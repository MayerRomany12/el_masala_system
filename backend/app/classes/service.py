from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.classes.repository import ClassRepository
from app.classes.schemas import (
    ClassGroupCreate,
    ClassGroupUpdate,
    AssignServantRequest,
    AddMemberRequest,
    TransferMemberRequest
)
from app.core.errors import NotFoundException, BadRequestException


class ClassService:
    def __init__(self, db: AsyncSession):
        self.repo = ClassRepository(db)

    async def create_class_group(self, data: ClassGroupCreate) -> Dict[str, Any]:
        return await self.repo.create_class_group(data.model_dump())

    async def get_class_group(self, class_id: str) -> Dict[str, Any]:
        cg = await self.repo.get_by_id(class_id)
        if not cg:
            raise NotFoundException("الفصل أو المجموعة غير موجودة")
        return cg

    async def list_classes(
        self,
        group_type: Optional[str] = None,
        season_id: Optional[str] = None,
        stage: Optional[str] = None,
        status: Optional[str] = None,
        is_active: Optional[bool] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        return await self.repo.list_classes(
            group_type=group_type,
            season_id=season_id,
            stage=stage,
            status=status,
            is_active=is_active,
            limit=limit
        )

    async def update_class_group(self, class_id: str, data: ClassGroupUpdate) -> Dict[str, Any]:
        existing = await self.repo.get_by_id(class_id)
        if not existing:
            raise NotFoundException("الفصل غير موجود")
        update_dict = data.model_dump(exclude_unset=True)
        return await self.repo.update_class_group(class_id, update_dict)

    # Servant Management
    async def assign_servant(self, class_id: str, data: AssignServantRequest) -> Dict[str, Any]:
        existing = await self.repo.get_by_id(class_id)
        if not existing:
            raise NotFoundException("الفصل غير موجود")
        return await self.repo.assign_servant(class_id, data.servant_id, data.role)

    async def unassign_servant(self, class_id: str, servant_id: str) -> bool:
        return await self.repo.unassign_servant(class_id, servant_id)

    async def list_class_servants(self, class_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        return await self.repo.list_class_servants(class_id, active_only=active_only)

    # Member Management
    async def add_member(self, class_id: str, data: AddMemberRequest) -> Dict[str, Any]:
        existing = await self.repo.get_by_id(class_id)
        if not existing:
            raise NotFoundException("الفصل غير موجود")
        return await self.repo.add_member(class_id, data.member_id)

    async def transfer_member(self, data: TransferMemberRequest) -> Dict[str, Any]:
        if data.from_class_id == data.to_class_id:
            raise BadRequestException("لا يمكن نقل المخدوم لنفس الفصل الحالي")
        return await self.repo.transfer_member(data.from_class_id, data.to_class_id, data.member_id)

    async def remove_member(self, class_id: str, member_id: str) -> bool:
        return await self.repo.remove_member(class_id, member_id)

    async def list_class_members(self, class_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        return await self.repo.list_class_members(class_id, active_only=active_only)
