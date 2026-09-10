import json
from fastapi import APIRouter, Depends, UploadFile, File, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import require_permission
from app.backup.service import BackupService
from app.shared.response import success_response
from app.core.errors import BadRequestException

router = APIRouter(prefix="/backup", tags=["System Backup & Restore Engine"])


@router.get("/download", response_model=dict)
async def download_backup(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("system:backup"))
):
    service = BackupService(db)
    backup_obj = await service.generate_backup(current_user)
    file_name = f"almasalla_backup_{backup_obj['metadata']['created_at'][:10]}.json"
    
    return JSONResponse(
        content=backup_obj,
        headers={"Content-Disposition": f"attachment; filename={file_name}"}
    )


@router.post("/restore", response_model=dict)
async def restore_backup(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("system:restore"))
):
    if not file.filename.endswith(".json"):
        raise BadRequestException("يجب أن يكون الملف المرفوع بصيغة JSON حصرية.")

    try:
        content = await file.read()
        backup_dict = json.loads(content.decode("utf-8"))
    except Exception:
        raise BadRequestException("ملف النسخة الاحتياطية المرفوع تالف أو غير مكتمل.")

    service = BackupService(db)
    result = await service.restore_backup(backup_dict, current_user, request)
    return success_response(data=result, message="تمت استعادة البيانات وإعادة مزامنة النظام بنجاح")
