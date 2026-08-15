from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime


class ReportTypeEnum:
    ATTENDANCE = "attendance"
    FINANCIALS = "financials"
    FOLLOWUP = "followup"
    BIRTHDAYS = "birthdays"


class AttendanceReportItem(BaseModel):
    session_id: str
    session_date: str
    stage: str
    session_title: str
    targeted_members_count: int
    present_count: int
    attendance_percentage: float


class FinancialReportItem(BaseModel):
    event_id: str
    event_title: str
    event_type: str
    event_fee: float
    registrations_count: int
    total_base_fee: float
    total_attendance_discount: float
    total_points_discount: float
    total_amount_due: float
    total_amount_paid: float
    total_remaining: float


class FollowupReportSummary(BaseModel):
    total_active_tasks: int
    pending_tasks_count: int
    completed_tasks_count: int
    escalated_tasks_count: int
    urgent_priority_count: int
    outcomes_breakdown: Dict[str, int]


class BirthdayReportSummary(BaseModel):
    year: int
    total_eligible_children: int
    delivered_gifts_count: int
    pending_gifts_count: int
    delivery_rate_pct: float
