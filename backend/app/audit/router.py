from fastapi import APIRouter, Depends, Query, Request
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import require_permission
from app.audit.service import AuditService
from app.shared.response import success_response

router = APIRouter(prefix="/audit-logs", tags=["Audit & Activity Logs"])


@router.get("", response_model=dict)
async def list_audit_logs(
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("audit:read"))
):
    service = AuditService(db)
    result = await service.list_logs(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        search=search,
        page=page,
        limit=limit
    )
    return success_response(data=result, message="تم جلب سجلات التدقيق والنشاطات بنجاح")
