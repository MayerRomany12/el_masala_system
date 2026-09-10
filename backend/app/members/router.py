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


@router.patch("/{member_id}/archive", response_model=dict)
async def archive_member(
    member_id: str,
    is_archived: bool = Query(..., alias="is_archived"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    service = MemberService(db)
    updated = await service.archive_member(member_id, is_archived, current_user.get("user_id"))
    msg = "تم أرشفة حساب المخدوم وتأمينه بنجاح" if is_archived else "تم إلغاء أرشفة حساب المخدوم وإعادته للنظام"
    return success_response(data=updated, message=msg)


from fastapi import UploadFile, File
import os, uuid, io
from PIL import Image
from app.core.errors import BadRequestException

# Protect against decompression bomb attacks
Image.MAX_IMAGE_PIXELS = 10_000_000
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB limit
ALLOWED_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


@router.post("/{member_id}/photo", response_model=dict)
async def upload_member_photo(
    member_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    if not file.filename or not file.content_type:
        raise BadRequestException("ملف الصورة المرفوع غير صالح.")

    lower_filename = file.filename.lower()
    if lower_filename.endswith(".svg") or file.content_type.lower() == "image/svg+xml":
        raise BadRequestException("ملفات SVG غير مسموح بها لأسباب أمنية. يرجى رفع صورة JPEG أو PNG أو WebP.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise BadRequestException("حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت).")

    # 1. Verify image decode & integrity
    try:
        img_verify = Image.open(io.BytesIO(contents))
        img_verify.verify()
    except Exception:
        raise BadRequestException("الملف المرفوع ليس صورة صالحة أو أنه ملف تالف.")

    # 2. Inspect format & dimensions safely
    try:
        img = Image.open(io.BytesIO(contents))
        img_format = (img.format or "").upper()
        if img_format not in ALLOWED_FORMATS:
            raise BadRequestException("صيغة الصورة غير مسموح بها. الصيغ المسموحة هي: JPEG, PNG, WebP فقط.")

        width, height = img.size
        if width > 4096 or height > 4096:
            raise BadRequestException("أبعاد الصورة تتجاوز الحد الأقصى المسموح به (4096×4096 بكسل).")
    except BadRequestException:
        raise
    except Exception:
        raise BadRequestException("عفواً، فشل التحقق من بنية الصورة المرفوعة.")

    uploads_dir = os.path.abspath("uploads/photos")
    try:
        os.makedirs(uploads_dir, exist_ok=True)
    except Exception:
        uploads_dir = "/tmp/uploads/photos"
        os.makedirs(uploads_dir, exist_ok=True)

    ext = ALLOWED_FORMATS[img_format]
    safe_filename = f"photo_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(uploads_dir, safe_filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    photo_url = f"/uploads/photos/{safe_filename}"
    service = MemberService(db)
    updated = await service.update_member_photo(member_id, photo_url)
    return success_response(data=updated, message="تم حفظ وصحة فحص صورة المخدوم بنجاح 🖼️")


