from fastapi import APIRouter, Depends, Query, Header, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.attendance.schemas import (
    AttendanceSessionCreate,
    AttendanceSessionRecurrenceUpdate,
    AttendanceScanRequest,
    AttendanceCancelRequest,
    AuthorizedDeviceCreate
)
from app.attendance.service import AttendanceService
from app.shared.response import success_response

router = APIRouter(prefix="/attendance", tags=["Authorized Attendance System"])


# ─── Authorized Devices ───────────────────────────────────────────────────────

@router.post("/devices", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_authorized_device(
    device_in: AuthorizedDeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("devices:manage"))
):
    service = AttendanceService(db)
    new_device = await service.register_device(device_in, current_user.get("user_id"))
    return success_response(data=new_device, message="تم اعتماد وتخصيص جهاز الخدمة بنجاح")


@router.get("/devices", response_model=dict)
async def list_authorized_devices(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("devices:manage"))
):
    service = AttendanceService(db)
    devices = await service.repo.list_devices()
    return success_response(data=devices, message="تم جلب قائمة الأجهزة المعتمدة")


# ─── Attendance Sessions ──────────────────────────────────────────────────────

@router.post("/sessions", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_attendance_session(
    session_in: AttendanceSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("attendance:session"))
):
    service = AttendanceService(db)
    new_session = await service.create_session(session_in, current_user.get("user_id"))
    return success_response(data=new_session, message=f"تم فتح جلسة حضور جديدة بالرمز {new_session['session_id']}")


@router.get("/sessions", response_model=dict)
async def list_attendance_sessions(
    search: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("attendance:session"))
):
    service = AttendanceService(db)
    result = await service.list_sessions(
        search=search, stage=stage, status=status, page=page, limit=limit
    )
    return success_response(data=result, message="تم جلب جلسات الحضور بنجاح")


@router.get("/sessions/{session_id}", response_model=dict)
async def get_attendance_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("attendance:session"))
):
    service = AttendanceService(db)
    session = await service.get_session_by_id(session_id)
    return success_response(data=session, message="تم جلب تفاصيل الجلسة والإحصائيات")


@router.patch("/sessions/{session_id}/status", response_model=dict)
async def update_session_status(
    session_id: str,
    status_str: str = Query(..., alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("attendance:session"))
):
    service = AttendanceService(db)
    updated = await service.update_session_status(session_id, status_str)
    return success_response(data=updated, message=f"تم تغيير حالة الجلسة إلى {status_str}")


@router.patch("/sessions/{session_id}/recurrence", response_model=dict)
async def update_session_recurrence(
    session_id: str,
    body: AttendanceSessionRecurrenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("attendance:session"))
):
    """
    تغيير تصنيف وتكرار الجلسة الخدمية (Daily, Weekly, Monthly, OneTime)
    يمكن تحويل أي جلسة متكررة إلى OneTime (مرة واحدة فقط) لتتوقف عن التكرار مستقبلاً.
    """
    service = AttendanceService(db)
    updated = await service.update_session_recurrence(session_id, body.recurrence)
    return success_response(data=updated, message=f"تم تحديث تصنيف الجلسة وتكرارها إلى: {body.recurrence}")


# ─── UNIFIED ATTENDANCE SCAN MOTOR ─────────────────────────────────────────────

@router.post("/scan", response_model=dict)
async def record_attendance_scan(
    scan_in: AttendanceScanRequest,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("attendance:scan"))
):
    """
    المحرك الموحد لتسجيل الحضور الفوري بالربط الثلاثي المحكم.
    يتعرف على الجهاز المعتمد تلقائياً من الهيدر Standard X-Device-Token.
    """
    service = AttendanceService(db)
    record = await service.record_attendance(
        data=scan_in,
        current_user=current_user,
        device_token=x_device_token
    )
    return success_response(
        data=record,
        message=f"تم تسجيل حضور الطفل ({record['member_name']}) بنجاح 🟢"
    )


@router.get("/sessions/{session_id}/records", response_model=dict)
async def get_session_attendance_records(
    session_id: str,
    status: Optional[str] = Query("Valid"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("attendance:session"))
):
    service = AttendanceService(db)
    records = await service.get_session_records(session_id=session_id, status=status, search=search)
    return success_response(data=records, message="تم جلب كشف الحضور اللحظي للجلسة")


@router.patch("/records/{record_id}/cancel", response_model=dict)
async def cancel_attendance_record(
    record_id: str,
    cancel_in: AttendanceCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("attendance:session"))
):
    """
    إلغاء وتصحيح تسجيل حضور طفل دون حذف السجل المالي والتاريخي.
    """
    service = AttendanceService(db)
    cancelled = await service.cancel_attendance_record(
        record_id=record_id,
        current_user_id=current_user.get("user_id"),
        reason=cancel_in.cancellation_reason
    )
    return success_response(data=cancelled, message="تم إلغاء وتسوية تسجيل الحضور بنجاح")
