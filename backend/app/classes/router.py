from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.classes.schemas import (
    ClassGroupCreate,
    ClassGroupUpdate,
    AssignServantRequest,
    AddMemberRequest,
    TransferMemberRequest
)
from app.classes.service import ClassService
from app.shared.response import success_response

router = APIRouter(prefix="/classes", tags=["Classes & Groups Management"])


@router.get("", response_model=dict)
async def list_classes(
    group_type: Optional[str] = Query(None, description="نوع المجموعة: Regular أو Summer"),
    season_id: Optional[str] = Query(None, description="تصفية بحسب الموسم الخدمي"),
    stage: Optional[str] = Query(None, description="تصفية بالمرحلة الدراسية"),
    status: Optional[str] = Query(None, description="تصفية بالحالة: Active, Inactive, Archived"),
    is_active: Optional[bool] = Query(None, description="تصفية بالحالة النشطة"),
    limit: Optional[int] = Query(100, description="الحد الأقصى للنتائج"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = ClassService(db)
    items = await service.list_classes(
        group_type=group_type,
        season_id=season_id,
        stage=stage,
        status=status,
        is_active=is_active,
        limit=limit
    )
    return success_response(data={"items": items, "total": len(items)}, message="تم جلب قائمة الفصول والمجموعات بنجاح")



@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_class_group(
    data: ClassGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = ClassService(db)
    class_group = await service.create_class_group(data)
    return success_response(data=class_group, message="تم إنشاء الفصل/المجموعة بنجاح")


@router.get("/{class_id}", response_model=dict)
async def get_class_group(
    class_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = ClassService(db)
    class_group = await service.get_class_group(class_id)
    return success_response(data=class_group, message="تم جلب تفاصيل الفصل بنجاح")


@router.put("/{class_id}", response_model=dict)
async def update_class_group(
    class_id: str,
    data: ClassGroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = ClassService(db)
    class_group = await service.update_class_group(class_id, data)
    return success_response(data=class_group, message="تم تحديث بيانات الفصل بنجاح")


# Servants Management
@router.get("/{class_id}/servants", response_model=dict)
async def list_class_servants(
    class_id: str,
    active_only: bool = Query(True, description="عرض الخدام النشطين فقط"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = ClassService(db)
    servants = await service.list_class_servants(class_id, active_only=active_only)
    return success_response(data={"items": servants, "total": len(servants)}, message="تم جلب قائمة خدام الفصل بنجاح")


@router.post("/{class_id}/servants", response_model=dict, status_code=status.HTTP_201_CREATED)
async def assign_servant(
    class_id: str,
    data: AssignServantRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = ClassService(db)
    result = await service.assign_servant(class_id, data)
    return success_response(data=result, message="تم تعيين الخادم للفصل بنجاح")


@router.delete("/{class_id}/servants/{servant_id}", response_model=dict)
async def unassign_servant(
    class_id: str,
    servant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = ClassService(db)
    await service.unassign_servant(class_id, servant_id)
    return success_response(data=None, message="تم إخراج الخادم من الفصل بنجاح")


# Members Management
@router.get("/{class_id}/members", response_model=dict)
async def list_class_members(
    class_id: str,
    active_only: bool = Query(True, description="عرض المخدومين النشطين فقط"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = ClassService(db)
    members = await service.list_class_members(class_id, active_only=active_only)
    return success_response(data={"items": members, "total": len(members)}, message="تم جلب قائمة مخدومي الفصل بنجاح")


@router.post("/{class_id}/members", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_member(
    class_id: str,
    data: AddMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = ClassService(db)
    result = await service.add_member(class_id, data)
    return success_response(data=result, message="تم إضافة المخدوم للفصل بنجاح")


@router.post("/transfer-member", response_model=dict)
async def transfer_member(
    data: TransferMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = ClassService(db)
    result = await service.transfer_member(data)
    return success_response(data=result, message="تم نقل المخدوم بين الفصول بنجاح مع حفظ السجل التاريخي 🔄")


@router.delete("/{class_id}/members/{member_id}", response_model=dict)
async def remove_member(
    class_id: str,
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("classes:manage"))
):
    service = ClassService(db)
    await service.remove_member(class_id, member_id)
    return success_response(data=None, message="تم إنهاء عضوية المخدوم بالفصل بنجاح")
