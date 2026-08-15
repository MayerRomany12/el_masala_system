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
