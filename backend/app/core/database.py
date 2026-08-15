from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
from app.core.logging import logger
from typing import AsyncGenerator


class Base(DeclarativeBase):
    pass


# Async SQLAlchemy Engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"statement_cache_size": 0},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def init_db():
    """Create all tables on startup and apply missing column migrations."""
    # Import all models so SQLAlchemy registers them
    from app.models import user, member, event, attendance, followup, rewards, setting, birthday, internal_messages  # noqa
    from sqlalchemy import text, select

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Migrations for User custom & revoked permissions
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions TEXT[] DEFAULT '{}';"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS revoked_permissions TEXT[] DEFAULT '{}';"))

        # Migrations for Event is_free and recurrence
        await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence VARCHAR(30) DEFAULT 'OneTime';"))

        # Migrations for AttendanceSession recurrence
        await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS recurrence VARCHAR(30) DEFAULT 'Weekly';"))

        # Migrations for Member date_of_birth and total_points
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64);"))
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS card_issued_at TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS total_points INT DEFAULT 0;"))

        # Approved Partial Unique Index for M6 Followup Task Deduplication
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_member_active_followup
            ON followup_tasks (member_id)
            WHERE status IN ('Pending', 'Escalated');
        """))

    # Ensure church logo exists in frontend assets safely
    import shutil, os
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        dst_img = os.path.abspath(os.path.join(current_dir, "..", "..", "..", "frontend", "src", "assets", "church_logo.png"))
        src_img = r"C:\Users\Mayer_R\.gemini\antigravity-ide\brain\6730460c-7e7a-4095-a1ab-a58973a90b03\media__1786743334870.jpg"
        if os.path.exists(src_img) and not os.path.exists(dst_img):
            shutil.copyfile(src_img, dst_img)
    except Exception:
        pass

    # Seed Default System Settings
    async with AsyncSessionLocal() as session:
        default_settings = [
            ("attendance_points", "10", "نقاط حضور اجتماع مدارس الأحد التلقائية"),
            ("event_points", "20", "نقاط مشاركة وتواجد الرحلات والأنشطة"),
            ("points_redemption_rate", "0.25", "سعر النقطة المالي بالجنيه (0.25 جم للنقطة)"),
            ("absence_threshold_weeks", "2", "عدد أسابيع الغياب المتتالية لبدء الافتقاد التلقائي"),
            ("discount_high_pct", "30.0", "نسبة الخصم المالي للانتظام المرتفع (90%+)"),
            ("discount_medium_pct", "15.0", "نسبة الخصم المالي للانتظام المتوسط (75%-89%)"),
            ("church_name", "كنيسة السيدة العذراء مريم والأنبا بولا بالمسلة", "اسم الكنيسة المطبوع بالبطاقات والتقارير")
        ]
        for key, val, desc in default_settings:
            q = await session.execute(select(setting.SystemSetting).where(setting.SystemSetting.key == key))
            if not q.scalar_one_or_none():
                session.add(setting.SystemSetting(key=key, value=val, description=desc))

        # Ensure Initial Super Admin User exists & credentials match config
        from app.models.user import User
        from app.core.security import get_password_hash
        from app.users.schemas import RoleEnum

        q_user = await session.execute(
            select(User).where(
                (User.username == settings.INITIAL_SUPERADMIN_USERNAME) |
                (User.email == settings.INITIAL_SUPERADMIN_EMAIL) |
                (User.user_id == "USR-SUPERADMIN-001")
            )
        )
        existing_admin = q_user.scalar_one_or_none()
        if not existing_admin:
            new_admin = User(
                user_id="USR-SUPERADMIN-001",
                username=settings.INITIAL_SUPERADMIN_USERNAME,
                email=settings.INITIAL_SUPERADMIN_EMAIL,
                full_name="مدير النظام الأساسي",
                hashed_password=get_password_hash(settings.INITIAL_SUPERADMIN_PASSWORD),
                role=RoleEnum.SUPER_ADMIN,
                assigned_stages=[],
                assigned_groups=[],
                is_active=True,
            )
            session.add(new_admin)
            logger.info("Auto-created Super Admin user.")
        else:
            existing_admin.username = settings.INITIAL_SUPERADMIN_USERNAME
            existing_admin.email = settings.INITIAL_SUPERADMIN_EMAIL
            existing_admin.hashed_password = get_password_hash(settings.INITIAL_SUPERADMIN_PASSWORD)
            existing_admin.is_active = True
            logger.info("Auto-updated Super Admin credentials.")

        await session.commit()
    logger.info("Database tables created / verified successfully.")


async def close_db():
    """Dispose engine on shutdown."""
    await engine.dispose()
    logger.info("Database connection pool closed.")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_database():
    return get_db()
