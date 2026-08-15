from fastapi import APIRouter, Depends, Query, Response, status
from typing import Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.reports.service import ReportsService
from app.shared.response import success_response

router = APIRouter(prefix="/reports", tags=["Analytics, Reports & Data Export Engine"])


@router.get("/attendance", response_model=dict)
async def get_attendance_report(
    stage: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("reports:export"))
):
    service = ReportsService(db)
    items = await service.get_attendance_report(stage=stage, from_date=from_date, to_date=to_date)
    return success_response(data={"items": items, "total": len(items)}, message="تم حساب تقرير الحضور والانتظام بنجاح")


@router.get("/financials", response_model=dict)
async def get_financial_report(
    event_type: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("reports:export"))
):
    service = ReportsService(db)
    items = await service.get_financial_report(event_type=event_type, from_date=from_date, to_date=to_date)
    
    # Financial breakdown totals
    t_base = round(sum(i["total_base_fee"] for i in items), 2)
    t_att_disc = round(sum(i["total_attendance_discount"] for i in items), 2)
    t_pts_disc = round(sum(i["total_points_discount"] for i in items), 2)
    t_due = round(sum(i["total_amount_due"] for i in items), 2)
    t_paid = round(sum(i["total_amount_paid"] for i in items), 2)
    t_rem = round(sum(i["total_remaining"] for i in items), 2)

    return success_response(
        data={
            "items": items,
            "total_events": len(items),
            "summary": {
                "total_base_fee": t_base,
                "total_attendance_discount": t_att_disc,
                "total_points_discount": t_pts_disc,
                "total_amount_due": t_due,
                "total_amount_paid": t_paid,
                "total_remaining": t_rem
            }
        },
        message="تم حساب التقرير المالي للرحلات والأنشطة والخصومات بنجاح"
    )


@router.get("/followup", response_model=dict)
async def get_followup_report(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("reports:export"))
):
    service = ReportsService(db)
    data = await service.get_followup_report()
    return success_response(data=data, message="تم حساب تقرير أداء الافتقاد ومتابعة الغائبين بنجاح")


@router.get("/birthdays", response_model=dict)
async def get_birthday_report(
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("reports:export"))
):
    service = ReportsService(db)
    data = await service.get_birthday_report(year=year)
    return success_response(data=data, message="تم حساب تقرير أعياد الميلاد وتوزيع الهدايا بنجاح")


# ─── Multi-Format Data Export Endpoints (Excel / PDF / CSV) ─────────────────────

@router.get("/export/excel")
async def export_excel(
    report_type: str = Query("attendance", description="نوع التقرير: attendance, financials"),
    stage: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("reports:export"))
):
    service = ReportsService(db)
    content, media_type, filename = await service.export_report(
        report_type=report_type,
        export_format="excel",
        stage=stage,
        event_type=event_type,
        from_date=from_date,
        to_date=to_date
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/csv")
async def export_csv(
    report_type: str = Query("attendance", description="نوع التقرير: attendance, financials"),
    stage: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("reports:export"))
):
    service = ReportsService(db)
    content, media_type, filename = await service.export_report(
        report_type=report_type,
        export_format="csv",
        stage=stage,
        event_type=event_type,
        from_date=from_date,
        to_date=to_date
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/pdf")
async def export_pdf(
    report_type: str = Query("attendance", description="نوع التقرير: attendance, financials"),
    stage: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("reports:export"))
):
    service = ReportsService(db)
    content, media_type, filename = await service.export_report(
        report_type=report_type,
        export_format="pdf",
        stage=stage,
        event_type=event_type,
        from_date=from_date,
        to_date=to_date
    )
    return Response(content=content, media_type=media_type)
