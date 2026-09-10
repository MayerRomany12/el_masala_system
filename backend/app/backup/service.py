import json
from datetime import datetime, date, timezone
from typing import Dict, Any
from sqlalchemy import select, delete, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request

from app.models import (
    User, Member, Event, EventRegistration, AuthorizedDevice,
    AttendanceSession, AttendanceSessionServant, AttendanceRecord,
    FollowupTask, FollowupLog, PointsTransaction, SystemSetting,
    BirthdayGiftDelivery, InternalMessage, MessageRecipient, AuditLog
)
from app.audit.service import AuditService
from app.core.errors import BadRequestException, AppException


def _json_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


class BackupService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)

    async def generate_backup(self, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """تصدير شامل لجميع جداول قاعدة البيانات بملف JSON مؤرخ ومحمي"""
        models_map = {
            "members": Member,
            "users": User,
            "events": Event,
            "event_registrations": EventRegistration,
            "authorized_devices": AuthorizedDevice,
            "attendance_sessions": AttendanceSession,
            "attendance_session_servants": AttendanceSessionServant,
            "attendance_records": AttendanceRecord,
            "followup_tasks": FollowupTask,
            "followup_logs": FollowupLog,
            "points_transactions": PointsTransaction,
            "birthday_gift_deliveries": BirthdayGiftDelivery,
            "internal_messages": InternalMessage,
            "message_recipients": MessageRecipient,
            "system_settings": SystemSetting
        }

        backup_data = {}
        for table_name, model in models_map.items():
            res = await self.db.execute(select(model))
            rows = res.scalars().all()

            table_rows = []
            for row in rows:
                row_dict = {}
                for col in row.__table__.columns:
                    val = getattr(row, col.name)
                    if isinstance(val, (datetime, date)):
                        val = val.isoformat()
                    row_dict[col.name] = val
                table_rows.append(row_dict)

            backup_data[table_name] = table_rows

        metadata = {
            "system_name": "نظام المسلة - كنيسة السيدة العذراء مريم والأنبا بولا بالمسلة",
            "version": "1.0.0",
            "schema_version": "1.1",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.get("user_id"),
            "created_by_name": current_user.get("full_name") or current_user.get("username"),
            "tables_count": len(backup_data)
        }

        # Audit log for backup download
        await self.audit_service.log_event(
            action="BACKUP_DOWNLOAD",
            resource_type="Backup",
            current_user=current_user,
            details=f"تم تصدير نسخة احتياطية تتضمن {len(backup_data)} جدول كنسي"
        )

        return {
            "metadata": metadata,
            "data": backup_data
        }

    async def restore_backup(
        self,
        backup_content: Dict[str, Any],
        current_user: Dict[str, Any],
        request: Request
    ) -> Dict[str, Any]:
        """
        استعادة النسخة الاحتياطية بصفة ذرية كاملة داخل Top-Level DB Transaction.
        في حالة حدوث أي خطأ يحصل Rollback تلقائي مع حفظ سجل الفشل بشكل مستقل.
        """
        if not isinstance(backup_content, dict):
            raise BadRequestException("محتوى النسخة الاحتياطية ليس هيكل JSON صالح.")

        if "metadata" not in backup_content or "data" not in backup_content:
            raise BadRequestException("بنية ملف النسخة الاحتياطية غير صالحة. يجب أن يتضمن metadata و data.")

        metadata = backup_content["metadata"]
        data = backup_content["data"]

        if not isinstance(metadata, dict) or "schema_version" not in metadata:
            raise BadRequestException("إصدار المخطط غير مدعوم في النسخة الاحتياطية.")

        try:
            # 1. Restore SystemSettings
            if "system_settings" in data and isinstance(data["system_settings"], list):
                for s in data["system_settings"]:
                    q = await self.db.execute(select(SystemSetting).where(SystemSetting.key == s["key"]))
                    existing = q.scalar_one_or_none()
                    if existing:
                        existing.value = s["value"]
                        existing.description = s.get("description", existing.description)
                    else:
                        self.db.add(SystemSetting(**s))

            # 2. Restore Members
            if "members" in data and isinstance(data["members"], list):
                for m in data["members"]:
                    if isinstance(m.get("date_of_birth"), str) and m["date_of_birth"]:
                        m["date_of_birth"] = datetime.fromisoformat(m["date_of_birth"]).date()
                    if isinstance(m.get("card_issued_at"), str) and m["card_issued_at"]:
                        m["card_issued_at"] = datetime.fromisoformat(m["card_issued_at"])
                    if isinstance(m.get("archived_at"), str) and m["archived_at"]:
                        m["archived_at"] = datetime.fromisoformat(m["archived_at"])

                    q = await self.db.execute(select(Member).where(Member.member_id == m["member_id"]))
                    existing = q.scalar_one_or_none()
                    if existing:
                        for k, v in m.items():
                            if k not in ["created_at", "updated_at"]:
                                setattr(existing, k, v)
                    else:
                        m_copy = {k: v for k, v in m.items() if k not in ["created_at", "updated_at"]}
                        self.db.add(Member(**m_copy))

            await self.db.commit()

            # Record audit log for successful restore after commit
            await self.audit_service.log_event(
                action="BACKUP_RESTORE_SUCCESS",
                resource_type="Backup",
                current_user=current_user,
                details=f"تم استعادة النسخة الاحتياطية (المخطط: {metadata.get('schema_version')}) بنجاح",
                request=request
            )

            return {
                "success": True,
                "message": f"تم استعادة النسخة الاحتياطية بنجاح (المخطط: {metadata.get('schema_version')})"
            }

        except Exception as e:
            await self.db.rollback()

            # Safe isolated audit logging for restore failure
            try:
                from app.core.database import async_session_maker
                async with async_session_maker() as isolated_db:
                    iso_audit = AuditService(isolated_db)
                    await iso_audit.log_event(
                        action="BACKUP_RESTORE_FAILED",
                        resource_type="Backup",
                        current_user=current_user,
                        details=f"فشلت عملية استعادة النسخة الاحتياطية. السبب: {str(e)}",
                        request=request
                    )
            except Exception:
                pass

            raise AppException(message=f"فشلت عملية استعادة النسخة الاحتياطية وتم إلغاء التغييرات تلقائياً. الخطأ: {str(e)}")
