import pytest
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.auth.dependencies import get_permissions_for_role
from app.users.schemas import RoleEnum

def test_password_hashing():
    password = "MySecurePassword123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    user_data = {"sub": "USR-123", "role": RoleEnum.ADMIN}
    token = create_access_token(user_data)
    assert isinstance(token, str)
    
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "USR-123"
    assert decoded["role"] == RoleEnum.ADMIN

def test_role_permissions():
    super_admin_perms = get_permissions_for_role(RoleEnum.SUPER_ADMIN)
    admin_perms = get_permissions_for_role(RoleEnum.ADMIN)
    servant_perms = get_permissions_for_role(RoleEnum.SERVANT)

    assert "users:delete" in super_admin_perms
    assert "users:delete" not in admin_perms
    assert "users:write" not in servant_perms
    assert "attendance:scan" in servant_perms


@pytest.mark.asyncio
async def test_composite_rate_limiting_lockout():
    from app.auth.service import AuthService, FAILED_LOGIN_ATTEMPTS
    from app.core.errors import AppException
    from unittest.mock import AsyncMock, MagicMock

    FAILED_LOGIN_ATTEMPTS.clear()

    mock_db = AsyncMock()
    service = AuthService()

    # Mock user repository returning None (invalid user)
    mock_repo = AsyncMock()
    mock_repo.get_by_username.return_value = None
    mock_repo.get_by_email.return_value = None
    service._get_repo = lambda db: mock_repo

    mock_request = MagicMock()
    mock_request.client.host = "192.168.1.100"

    # Perform 5 failed attempts
    for _ in range(5):
        with pytest.raises(AppException) as exc_info:
            await service.authenticate_user("unknown_user", "wrong_pass", mock_db, request=mock_request)
        assert exc_info.value.status_code == 401
        assert exc_info.value.message == "اسم المستخدم أو كلمة المرور غير صحيحة"

    # 6th attempt must trigger 429 Too Many Requests Lockout
    with pytest.raises(AppException) as exc_info:
        await service.authenticate_user("unknown_user", "wrong_pass", mock_db, request=mock_request)
    assert exc_info.value.status_code == 429
    assert "تم حظر محاولات تسجيل الدخول مؤقتاً" in exc_info.value.message


def test_sensitive_data_redaction():
    from app.audit.service import sanitize_sensitive_data
    raw_data = {
        "username": "mayer",
        "password_hash": "$2b$12$e0MY...",
        "qr_secret": "ABC123XYZ",
        "nested": {
            "token": "secret_token_val",
            "full_name": "Mayer"
        }
    }
    cleaned = sanitize_sensitive_data(raw_data)
    assert cleaned["username"] == "mayer"
    assert cleaned["password_hash"] == "[REDACTED]"
    assert cleaned["qr_secret"] == "[REDACTED]"
    assert cleaned["nested"]["token"] == "[REDACTED]"
    assert cleaned["nested"]["full_name"] == "Mayer"


