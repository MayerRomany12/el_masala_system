from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import ARRAY as PgARRAY
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id             = Column(String(50), primary_key=True, index=True)
    username            = Column(String(100), unique=True, nullable=False, index=True)
    email               = Column(String(200), unique=True, nullable=False, index=True)
    full_name           = Column(String(200), nullable=False)
    hashed_password     = Column(Text, nullable=False)
    role                = Column(String(50), nullable=False, default="Servant")
    assigned_stages     = Column(PgARRAY(String), nullable=False, server_default="{}")
    assigned_groups     = Column(PgARRAY(String), nullable=False, server_default="{}")
    # Custom Granular Permissions System:
    # Effective Permissions = (Role Permissions + custom_permissions) - revoked_permissions
    custom_permissions  = Column(PgARRAY(String), nullable=False, server_default="{}")
    revoked_permissions = Column(PgARRAY(String), nullable=False, server_default="{}")
    is_active           = Column(Boolean, nullable=False, default=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    last_login          = Column(DateTime(timezone=True), nullable=True)
