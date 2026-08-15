from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Church Child & Member Management System - نظام المسلة"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "church-almasalla-super-secret-jwt-key-min-32-chars-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Supabase / PostgreSQL
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/almasalla"

    INITIAL_SUPERADMIN_USERNAME: str = "superadmin"
    INITIAL_SUPERADMIN_PASSWORD: str = "SuperAdmin$()456"
    INITIAL_SUPERADMIN_EMAIL: str = "romanymayer3@gmail.com"

    CHURCH_NAME: str = "كنيسة السيدة العذراء مريم والأنبا بولا اول السواح بالمسلة"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
