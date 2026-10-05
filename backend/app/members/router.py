from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
import io, base64
from PIL import Image

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission, get_servant_class_ids
from app.members.schemas import MemberCreate, MemberUpdate, MemberStatusUpdate, CardPayload, PhotoDataPayload, ResidentialAreaCreate
from app.members.service import MemberService
from app.shared.response import success_response
from app.core.errors import BadRequestException

router = APIRouter(prefix="/members", tags=["Members & Children"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_in: MemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    # Verify servant class permission if class_id provided
    if member_in.class_id:
        allowed = await get_servant_class_ids(current_user, db)
        if allowed is not None and member_in.class_id not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لإضافة مخدوم في هذا الفصل")
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


@router.get("/areas/list", response_model=dict)
async def get_distinct_areas(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    service = MemberService(db)
    areas = await service.get_distinct_areas()
    return success_response(data=areas, message="تم جلب قائمة المناطق المسجلة")


@router.post("/areas", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_residential_area(
    area_in: ResidentialAreaCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    service = MemberService(db)
    added = await service.add_residential_area(area_in.name)
    return success_response(data={"name": added}, message=f"تم إضافة المنطقة '{added}' بنجاح")


@router.delete("/areas/{area_name}", response_model=dict)
async def delete_residential_area(
    area_name: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    service = MemberService(db)
    await service.delete_residential_area(area_name)
    return success_response(data={"name": area_name}, message=f"تم حذف المنطقة '{area_name}' بنجاح")



@router.post("/scan", response_model=dict)
async def scan_qr_card(
    payload: CardPayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    service = MemberService(db)
    member = await service.scan_qr_token(payload.token)
    return success_response(data=member, message="تم التحقق من بطاقة المخدوم بنجاح")


@router.get("", response_model=dict)
async def list_members(
    search: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    class_id: Optional[str] = Query(None, description="تصفية بحسب الفصل الخدمي"),
    area: Optional[str] = Query(None, description="تصفية بحسب المنطقة السكنية"),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    allowed_class_ids = await get_servant_class_ids(current_user, db)
    if class_id and allowed_class_ids is not None and class_id not in allowed_class_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لعرض هذا الفصل")

    service = MemberService(db)
    result = await service.list_members(
        search=search, stage=stage, class_id=class_id, area=area, status=status,
        allowed_class_ids=allowed_class_ids, page=page, limit=limit
    )
    return success_response(data=result, message="تم جلب قائمة المخدومين بنجاح")


@router.get("/{member_id}/card", response_model=dict)
async def get_member_card(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    service = MemberService(db)
    card_data = await service.get_or_create_qr_token(member_id)
    return success_response(data=card_data, message="تم جلب بيانات بطاقة العضوية بنجاح")


@router.get("/{member_id}/attendance-history", response_model=dict)
async def get_member_attendance_history(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:read"))
):
    service = MemberService(db)
    history = await service.get_member_attendance_history(member_id)
    return success_response(data=history, message="تم جلب سجل حضور وغياب المخدوم بنجاح")


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
    current_user=Depends(require_permission("members:archive"))
):
    service = MemberService(db)
    updated = await service.archive_member(member_id, is_archived, current_user.get("user_id"))
    msg = "تم أرشفة حساب المخدوم وتأمينه بنجاح" if is_archived else "تم إلغاء أرشفة حساب المخدوم وإعادته للنظام"
    return success_response(data=updated, message=msg)


# Protect against decompression bomb attacks
Image.MAX_IMAGE_PIXELS = 10_000_000
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB limit
ALLOWED_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


@router.put("/{member_id}/photo-data", response_model=dict)
async def update_member_photo_data(
    member_id: str,
    payload: PhotoDataPayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("members:write"))
):
    """حفظ الصورة المقصوصة والمعدلة مباشرة كـ Data URL دائم في قاعدة البيانات دون الاعتماد على ديسك السيرفر."""
    if not payload.photo_data or not payload.photo_data.startswith("data:image/"):
        raise BadRequestException("صيغة بيانات الصورة غير صالحة، يجب أن تبدأ بـ data:image/")

    service = MemberService(db)
    updated = await service.update_member_photo(member_id, payload.photo_data)
    return success_response(data=updated, message="تم حفظ وتحديث صورة المخدوم بالفريم بنجاح 🖼️")


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

        # Normalize and optimize for database storage
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize to max 400x400
        img.thumbnail((400, 400), Image.Resampling.LANCZOS)
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=85, optimize=True)
        b64_str = base64.b64encode(out_buf.getvalue()).decode("utf-8")
        persistent_data_url = f"data:image/jpeg;base64,{b64_str}"

    except BadRequestException:
        raise
    except Exception as e:
        raise BadRequestException(f"عفواً، فشلت معالجة الصورة المرفوعة: {str(e)}")

    service = MemberService(db)
    updated = await service.update_member_photo(member_id, persistent_data_url)
    return success_response(data=updated, message="تم حفظ وضغط صورة المخدوم وتثبيتها بنجاح 🖼️")



