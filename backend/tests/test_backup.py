import pytest
from app.backup.service import BackupService
from app.core.errors import BadRequestException
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_backup_restore_schema_validation():
    mock_db = AsyncMock()
    service = BackupService(mock_db)
    mock_request = MagicMock()
    user = {"user_id": "USR-1", "username": "admin", "role": "Super Admin"}

    # 1. Invalid syntax (not dict)
    with pytest.raises(BadRequestException) as exc1:
        await service.restore_backup("INVALID_STRING", user, mock_request)
    assert "ليس هيكل JSON صالح" in exc1.value.message

    # 2. Missing metadata key
    with pytest.raises(BadRequestException) as exc2:
        await service.restore_backup({"data": {}}, user, mock_request)
    assert "بنية ملف النسخة الاحتياطية غير صالحة" in exc2.value.message

    # 3. Missing schema_version in metadata
    with pytest.raises(BadRequestException) as exc3:
        await service.restore_backup({"metadata": {}, "data": {}}, user, mock_request)
    assert "إصدار المخطط غير مدعوم" in exc3.value.message
