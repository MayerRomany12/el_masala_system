from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from app.core.logging import logger


class AppException(HTTPException):
    def __init__(self, message: str = "خطأ في التطبيق", status_code: int = 400, details: dict = None):
        super().__init__(status_code=status_code, detail=message)
        self.message = message
        self.details = details or {}


class NotFoundException(AppException):
    def __init__(self, message: str = "العنصر غير موجود"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class BadRequestException(AppException):
    def __init__(self, message: str = "طلب غير صالح"):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST)


async def app_exception_handler(request: Request, exc: AppException):
    logger.warning(f"AppException on {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "details": exc.details
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"ValidationError on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "خطأ في التحقق من صحة البيانات المدخلة",
            "details": exc.errors()
        }
    )


async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    logger.error(f"Pydantic ValidationError on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "خطأ في هيكلة البيانات المسترجعة",
            "details": exc.errors()
        }
    )


async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    error_trace = traceback.format_exc()
    logger.error(f"Unhandled Exception on {request.url.path}: {str(exc)}\n{error_trace}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": f"حدث خطأ غير متوقع: {str(exc)}",
            "details": {"error": str(exc)}
        }
    )
