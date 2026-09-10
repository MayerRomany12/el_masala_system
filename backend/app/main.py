from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
import os
from fastapi.staticfiles import StaticFiles

from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.members.router import router as members_router
from app.settings.router import router as settings_router
from app.events.router import router as events_router
from app.attendance.router import router as attendance_router
from app.followup.router import router as followup_router
from app.rewards.router import router as rewards_router
from app.birthdays.router import router as birthdays_router
from app.reports.router import router as reports_router
from app.messages.router import router as messages_router
from app.audit.router import router as audit_router
from app.backup.router import router as backup_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(os.path.abspath("uploads/photos"), exist_ok=True)
    await init_db()       # Create tables and auto-migrations on startup
    yield
    await close_db()      # Dispose connection pool on shutdown


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="نظام إدارة أطفال وخدمة مدارس الأحد - كنيسة السيدة العذراء مريم والأنبا بولا بالمسلة",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Serve Uploaded Static Files (Photos & Assets)
uploads_path = os.path.abspath("uploads")
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    pydantic_validation_exception_handler,
    generic_exception_handler
)
from pydantic import ValidationError

# Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(ValidationError, pydantic_validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(members_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(attendance_router, prefix=settings.API_V1_STR)
app.include_router(followup_router, prefix=settings.API_V1_STR)
app.include_router(rewards_router, prefix=settings.API_V1_STR)
app.include_router(birthdays_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(messages_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(backup_router, prefix=settings.API_V1_STR)



@app.get("/")
async def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "church": settings.CHURCH_NAME,
        "version": "1.0.0",
        "docs": "/docs"
    }
