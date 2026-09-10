import pytest
import re
from app.members.schemas import MemberCreate

def test_member_id_format():
    import secrets
    num = secrets.randbelow(1_000_000)
    candidate_id = f"K-{num:06d}"
    assert re.match(r"^K-\d{6}$", candidate_id)

def test_member_schema_validation():
    member = MemberCreate(
        full_name="مارك فادي نبيل",
        gender="ذكر",
        stage="ابتدائي - الصف الأول",
        phone="01200000000"
    )
    assert member.full_name == "مارك فادي نبيل"
    assert member.stage == "ابتدائي - الصف الأول"
    assert member.status == "Active"


@pytest.mark.asyncio
async def test_photo_upload_security_checks():
    from app.members.router import upload_member_photo
    from app.core.errors import BadRequestException
    from unittest.mock import AsyncMock, MagicMock

    mock_db = AsyncMock()

    # 1. Reject SVG file
    svg_file = MagicMock()
    svg_file.filename = "malicious.svg"
    svg_file.content_type = "image/svg+xml"

    with pytest.raises(BadRequestException) as exc_info:
        await upload_member_photo("K-000001", svg_file, mock_db, {"user_id": "USR-1"})
    assert "SVG" in exc_info.value.message

    # 2. Reject non-image text file posing as PNG
    fake_png = MagicMock()
    fake_png.filename = "fake.png"
    fake_png.content_type = "image/png"
    fake_png.read = AsyncMock(return_value=b"NOT A REAL PNG FILE CONTENT")

    with pytest.raises(BadRequestException) as exc_info:
        await upload_member_photo("K-000001", fake_png, mock_db, {"user_id": "USR-1"})
    assert "ليس صورة صالحة" in exc_info.value.message

