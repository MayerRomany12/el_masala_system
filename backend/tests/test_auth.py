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
