from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, Request, status

from app.users.repository import UserRepository
from app.core.security import verify_password, create_access_token
from app.core.errors import AppException
from app.core.database import get_db

# Composite rate-limiting & lockout memory storage: key -> list of failure timestamps
FAILED_LOGIN_ATTEMPTS: Dict[str, List[datetime]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


class AuthService:
    def __init__(self, db: AsyncSession = None):
        self._db = db

    def _get_repo(self, db: AsyncSession) -> UserRepository:
        return UserRepository(db)

    async def authenticate_user(
        self,
        username: str,
        password: str,
        db: AsyncSession,
        request: Optional[Request] = None
    ) -> dict:
        repo = self._get_repo(db)
        clean_username = username.strip().lower()

        client_ip = request.client.host if request and request.client else "unknown"
        ip_key = f"ip:{client_ip}"
        user_key = f"user:{clean_username}"
        pair_key = f"pair:{client_ip}:{clean_username}"

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=LOCKOUT_MINUTES)

        # Clean old attempts and check lockout across IP, account, and pair buckets
        for key in [ip_key, user_key, pair_key]:
            if key in FAILED_LOGIN_ATTEMPTS:
                FAILED_LOGIN_ATTEMPTS[key] = [
                    t for t in FAILED_LOGIN_ATTEMPTS[key] if t > cutoff
                ]
                if len(FAILED_LOGIN_ATTEMPTS[key]) >= MAX_FAILED_ATTEMPTS:
                    raise AppException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        message=f"تم حظر محاولات تسجيل الدخول مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار {LOCKOUT_MINUTES} دقيقة قبل المحاولة مجدداً."
                    )

        user = await repo.get_by_username(username.strip())
        if not user:
            user = await repo.get_by_email(username.strip())

        if not user or not verify_password(password, user["hashed_password"]):
            # Track failed attempt across all buckets
            for key in [ip_key, user_key, pair_key]:
                if key not in FAILED_LOGIN_ATTEMPTS:
                    FAILED_LOGIN_ATTEMPTS[key] = []
                FAILED_LOGIN_ATTEMPTS[key].append(now)

            # Audit Log for failed login attempt (NO password logged!)
            try:
                from app.audit.service import AuditService
                audit_service = AuditService(db)
                await audit_service.log_event(
                    action="AUTH_LOGIN_FAILED",
                    resource_type="User",
                    details=f"محاولة تسجيل دخول فاشلة للمستخدم ({username.strip()}) من العنوان {client_ip}",
                    request=request
                )
            except Exception:
                pass

            raise AppException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="اسم المستخدم أو كلمة المرور غير صحيحة"
            )

        # Clear failed attempts on successful login for this pair and user
        for key in [ip_key, user_key, pair_key]:
            if key in FAILED_LOGIN_ATTEMPTS:
                del FAILED_LOGIN_ATTEMPTS[key]

        if not user.get("is_active", True):
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="حساب المستخدم معطل حالياً، يرجى مراجعة المسؤول"
            )

        from app.auth.dependencies import compute_effective_permissions
        user["effective_permissions"] = list(compute_effective_permissions(user))

        await repo.update_last_login(user["user_id"])
        access_token = create_access_token({"sub": user["user_id"], "role": user["role"]})

        # Audit Log for successful login
        try:
            from app.audit.service import AuditService
            audit_service = AuditService(db)
            await audit_service.log_event(
                action="AUTH_LOGIN_SUCCESS",
                resource_type="User",
                current_user=user,
                details=f"تسجيل دخول ناجح للمستخدم ({user.get('full_name')})",
                request=request
            )
        except Exception:
            pass

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

