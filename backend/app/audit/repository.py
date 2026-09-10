import secrets
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, date
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_log(
        self,
        action: str,
        resource_type: str,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        resource_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        إنشاء سجل تدقيق محمي غير قابل للتعديل أو الحذف (Append-Only)
        """
        rand_num = secrets.randbelow(1_000_000)
        candidate_id = f"AUD-{rand_num:06d}"

        log = AuditLog(
            log_id=candidate_id,
            user_id=user_id,
            user_name=user_name,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)

        return {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "user_name": log.user_name,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "details": log.details,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at
        }

    async def get_logs(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = select(AuditLog)

        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        if action:
            query = query.where(AuditLog.action == action)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    AuditLog.user_name.ilike(pattern),
                    AuditLog.details.ilike(pattern),
                    AuditLog.resource_id.ilike(pattern),
                    AuditLog.action.ilike(pattern)
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        logs = (await self.db.execute(query)).scalars().all()

        items = [{
            "log_id": l.log_id,
            "user_id": l.user_id,
            "user_name": l.user_name,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "old_values": l.old_values,
            "new_values": l.new_values,
            "details": l.details,
            "ip_address": l.ip_address,
            "user_agent": l.user_agent,
            "created_at": l.created_at
        } for l in logs]

        return items, total
