import pytest
from unittest.mock import AsyncMock, MagicMock
from app.main import app
from app.attendance.service import AttendanceService
from app.reports.repository import ReportsRepository
from app.birthdays.repository import _parse_dob_string
from datetime import date, datetime

def test_openapi_schema_generation():
    """Verify OpenAPI schema builds cleanly without any schema or router errors."""
    schema = app.openapi()
    assert schema is not None
    assert "paths" in schema
    assert "/api/v1/attendance/sessions" in schema["paths"]
    assert "/api/v1/reports/birthdays" in schema["paths"]
    assert "/api/v1/members" in schema["paths"]
    assert "/api/v1/seasons" in schema["paths"]

@pytest.mark.asyncio
async def test_attendance_service_list_devices_signature():
    """Verify AttendanceService.list_devices is an instance method and callable."""
    mock_db = AsyncMock()
    service = AttendanceService(mock_db)
    service.repo.list_devices = AsyncMock(return_value=[{"device_id": "DEV-01"}])
    devices = await service.list_devices()
    assert len(devices) == 1
    assert devices[0]["device_id"] == "DEV-01"

def test_reports_dob_parsing_and_datetime_support():
    """Verify date of birth parsing handles both date, datetime, and string formats."""
    d = date(2015, 6, 15)
    parsed = _parse_dob_string(d)
    assert parsed.year == 2015
    assert parsed.month == 6
    assert parsed.day == 15

    dt = datetime(2016, 8, 20, 10, 30)
    parsed_dt = _parse_dob_string(dt)
    assert parsed_dt.year == 2016
    assert parsed_dt.month == 8
    assert parsed_dt.day == 20

    s = "2017-09-25"
    parsed_s = _parse_dob_string(s)
    assert parsed_s.year == 2017
    assert parsed_s.month == 9
    assert parsed_s.day == 25
