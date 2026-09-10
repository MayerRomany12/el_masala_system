from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request
from app.audit.repository import AuditLogRepository


SENSITIVE_KEYS = {
    "password", "password_hash", "hashed_password", "token", "access_token",
    "refresh_token", "device_token", "qr_token", "qr_secret", "secret", "api_key"
}


def sanitize_sensitive_data(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not isinstance(data, dict):
        return data
    sanitized = {}
    for k, v in data.items():
        if k.lower() in SENSITIVE_KEYS:
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_sensitive_data(v)
        elif isinstance(v, list):
            sanitized[k] = [sanitize_sensitive_data(item) if isinstance(item, dict) else item for item in v]
        else:
            sanitized[k] = v
    return sanitized


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AuditLogRepository(db)

    async def log_event(
        self,
        action: str,
        resource_type: str,
        current_user: Optional[Dict[str, Any]] = None,
        resource_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        details: Optional[str] = None,
        request: Optional[Request] = None
    ) -> Dict[str, Any]:
        user_id = current_user.get("user_id") if current_user else None
        user_name = current_user.get("full_name") or current_user.get("username") if current_user else "System"

        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

        clean_old = sanitize_sensitive_data(old_values)
        clean_new = sanitize_sensitive_data(new_values)

        return await self.repo.create_log(
            action=action,
            resource_type=resource_type,
            user_id=user_id,
            user_name=user_name,
            resource_id=resource_id,
            old_values=clean_old,
            new_values=clean_new,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )

    async def list_logs(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        page = max(1, page)
        limit = min(100, max(1, limit))
        skip = (page - 1) * limit

        items, total = await self.repo.get_logs(
            user_id=user_id, action=action, resource_type=resource_type, search=search, skip=skip, limit=limit
        )
        return {"total": total, "page": page, "limit": limit, "items": items}
