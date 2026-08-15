import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.core.database import Base, init_db
from app.models import user, member  # Register all models
from app.models.user import User
from app.core.security import get_password_hash
from app.users.schemas import RoleEnum
from datetime import datetime, timezone


async def seed_database():
    print(f"Connecting to PostgreSQL / Supabase...")

    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        # Required for Supabase Transaction Pooler (pgBouncer)
        connect_args={"statement_cache_size": 0},
    )
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created / verified.")

    async with AsyncSessionLocal() as db:
        # Check if super admin exists
        result = await db.execute(
            select(User).where(User.username == settings.INITIAL_SUPERADMIN_USERNAME)
        )
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            print(f"Seeding Super Admin user '{settings.INITIAL_SUPERADMIN_USERNAME}'...")
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
            db.add(new_admin)
            await db.commit()
            print(f"Super Admin created successfully!")
            print(f"  Username: {settings.INITIAL_SUPERADMIN_USERNAME}")
            print(f"  Password: {settings.INITIAL_SUPERADMIN_PASSWORD}")
        else:
            print("Super Admin user already exists.")

    await engine.dispose()
    print("Seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed_database())
