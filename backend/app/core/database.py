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

async_session_maker = AsyncSessionLocal


async def init_db():
    """Create all tables on startup and apply missing column migrations."""
    # Import all models so SQLAlchemy registers them
    from app.models import user, member, event, attendance, followup, rewards, setting, birthday, internal_messages, audit_log  # noqa
    from app.models import class_group  # noqa
    from sqlalchemy import text, select

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Migrations for User custom & revoked permissions
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions TEXT[] DEFAULT '{}';"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS revoked_permissions TEXT[] DEFAULT '{}';"))

        # Migrations for Event is_free and recurrence
        await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence VARCHAR(30) DEFAULT 'OneTime';"))

        # Migrations for AttendanceSession recurrence & class binding
        await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS recurrence VARCHAR(30) DEFAULT 'Weekly';"))
        await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS class_id VARCHAR(30);"))
        await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS scheduled_end_time TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;"))

        # Migrations for Member date_of_birth, total_points, photo_url, archiving, and extra phones
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64);"))
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS card_issued_at TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS total_points INT DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url TEXT;"))
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS archived_by VARCHAR(50);"))
        try:
            await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(30);"))
            await conn.execute(text("ALTER TABLE members ADD COLUMN IF NOT EXISTS member_phone VARCHAR(30);"))
            logger.info("تم التحقق من إضافة عمودي secondary_phone و member_phone لجدول members بنجاح")
        except Exception as e:
            logger.exception(f"فشل تطبيق التحديث الهيكلي لجدول members: {e}")
            raise e

        # Approved Partial Unique Index for M6 Followup Task Deduplication
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_member_active_followup
            ON followup_tasks (member_id)
            WHERE status IN ('Pending', 'Escalated');
        """))


        # ── Safe RENAME COLUMN in isolated block (won't abort main transaction) ──
        try:
            async with engine.connect() as iso_conn:
                await iso_conn.execute(text("ALTER TABLE class_group_servants RENAME COLUMN user_id TO servant_id;"))
                await iso_conn.commit()
        except Exception:
            pass  # Column already renamed or doesn't exist — both are fine

        # ── ClassGroup servants schema & slug migrations ──
        await conn.execute(text("ALTER TABLE class_group_servants ADD COLUMN IF NOT EXISTS servant_id VARCHAR(50);"))
        await conn.execute(text("ALTER TABLE class_group_servants ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Servant';"))
        await conn.execute(text("ALTER TABLE class_group_servants ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();"))
        await conn.execute(text("ALTER TABLE class_group_servants ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;"))
        await conn.execute(text("ALTER TABLE class_group_servants ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ;"))

        # slug column + UNIQUE constraint (stable class identity — slug never changes)
        await conn.execute(text("ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS slug VARCHAR(50);"))
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_class_group_slug
            ON class_groups (slug)
            WHERE slug IS NOT NULL;
        """))

        # Partial Unique Indexes for ClassGroup memberships
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_active_class_member
            ON class_group_members (class_id, member_id)
            WHERE is_active = TRUE;
        """))
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_active_class_servant
            ON class_group_servants (class_id, servant_id)
            WHERE is_active = TRUE;
        """))
        logger.info("Migrations for ClassGroup schema applied successfully.")

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
            ("church_name", "كنيسة الشهيد العظيم مارجرجس الروماني والقديس العظيم الأنبا شنودة رئيس المتوحدين", "اسم الكنيسة المطبوع بالبطاقات والتقارير")
        ]
        for key, val, desc in default_settings:
            q = await session.execute(select(setting.SystemSetting).where(setting.SystemSetting.key == key))
            existing_s = q.scalar_one_or_none()
            if not existing_s:
                session.add(setting.SystemSetting(key=key, value=val, description=desc))
            elif key == "church_name" and ("مارجرجس" not in (existing_s.value or "")):
                existing_s.value = val

        # ─── Seed 13 Default ClassGroups (slug = stable identity, name = editable) ───
        from app.models.class_group import ClassGroup
        DEFAULT_CLASSES = [
            ("CLS-KG",           "KG",               "حضانة"),
            ("CLS-PRI-12",       "PRIMARY_1_2",       "أولى وتانية ابتدائي"),
            ("CLS-PRI-34",       "PRIMARY_3_4",       "تالتة ورابعة ابتدائي"),
            ("CLS-PRI-56",       "PRIMARY_5_6",       "خامسة وسادسة ابتدائي"),
            ("CLS-PREP-1",       "PREP_1",            "أولى إعدادي"),
            ("CLS-PREP-2",       "PREP_2",            "تانية إعدادي"),
            ("CLS-PREP-3",       "PREP_3",            "تالتة إعدادي"),
            ("CLS-SEC-1",        "SECONDARY_1",       "أولى ثانوي"),
            ("CLS-SEC-2",        "SECONDARY_2",       "تانية ثانوي"),
            ("CLS-SEC-3",        "SECONDARY_3",       "تالتة ثانوي"),
            ("CLS-UNI",          "UNIVERSITY_GRADS",  "جامعيين وخريجين"),
            ("CLS-DEACONS",      "DEACONS_HYMNS",     "حصة ألحان الشمامسة"),
            ("CLS-LITURGY",      "DIVINE_LITURGY",    "قداس إلهي"),
        ]
        for class_id, slug, name in DEFAULT_CLASSES:
            existing = await session.execute(
                select(ClassGroup).where(ClassGroup.slug == slug)
            )
            if not existing.scalar_one_or_none():
                session.add(ClassGroup(
                    class_id=class_id,
                    slug=slug,
                    name=name,
                    group_type="Standard",
                    status="Active",
                ))
                logger.info(f"Seeded default class: [{slug}] {name}")
        # ─────────────────────────────────────────────────────────────────────────────

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
