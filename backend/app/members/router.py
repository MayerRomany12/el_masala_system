from fastapi import APIRouter, Depends, Query, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.members.schemas import MemberCreate, MemberUpdate, MemberStatusUpdate, CardPayload
from app.members.service import MemberService
from app.shared.response import success_response

router = APIRouter(prefix="/members", tags=["Members & Children"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_in: MemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    service = MemberService(db)
    new_member = await service.create_member(member_in)
    return success_response(
        data=new_member,
        message=f"تم تسجيل المخدوم بنجاح بالرمز الفريد {new_member['member_id']}"
    )


@router.get("/stats", response_model=dict)
async def get_members_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    service = MemberService(db)
    stats = await service.get_stats()
    return success_response(data=stats, message="تم جلب إحصائيات المخدومين")


@router.post("/scan", response_model=dict)
async def scan_qr_card(
    payload: CardPayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    """
    استلام الـ QR Token القادم من الماسح الضوئي وإرجاع ملف الطفل المخدوم.
    ملاحظة: هذا الـ Endpoint مخصص لعرض الملف فقط ولا يُسجل أي حضور (تسجيل الحضور في M5).
    """
    service = MemberService(db)
    member = await service.scan_qr_token(payload.token)
    return success_response(data=member, message="تم التحقق من بطاقة المخدوم بنجاح")


@router.get("", response_model=dict)
async def list_members(
    search: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    service = MemberService(db)
    result = await service.list_members(
        search=search, stage=stage, status=status, page=page, limit=limit
    )
    return success_response(data=result, message="تم جلب قائمة المخدومين بنجاح")


@router.get("/{member_id}/card", response_model=dict)
async def get_member_card(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    """
    جلب بيانات البطاقة والـ QR Token للمخدوم.
    يُولد الـ Token مرة واحدة فقط عند الطلب الأول ولا يتبدل بعدها.
    """
    service = MemberService(db)
    card_data = await service.get_or_create_qr_token(member_id)
    return success_response(data=card_data, message="تم جلب بيانات بطاقة العضوية بنجاح")


@router.get("/{member_id}", response_model=dict)
async def get_member_by_id(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    service = MemberService(db)
    member = await service.get_member_by_id(member_id)
    return success_response(data=member, message="تم جلب بيانات المخدوم")


@router.put("/{member_id}", response_model=dict)
async def update_member(
    member_id: str,
    update_in: MemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    service = MemberService(db)
    updated = await service.update_member(member_id, update_in)
    return success_response(data=updated, message="تم تحديث بيانات المخدوم بنجاح")


@router.patch("/{member_id}/status", response_model=dict)
async def update_member_status(
    member_id: str,
    status_in: MemberStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    service = MemberService(db)
    updated = await service.update_member_status(member_id, status_in.status)
    return success_response(data=updated, message=f"تم تغيير حالة المخدوم إلى {status_in.status}")
