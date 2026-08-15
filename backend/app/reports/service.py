from typing import Optional, List, Dict, Any, Tuple
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.reports.repository import ReportsRepository
from app.settings.repository import SettingsRepository
from app.reports.export_engine import generate_csv_bytes, generate_excel_bytes, generate_pdf_html
from app.core.errors import BadRequestException


class ReportsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReportsRepository(db)
        self.settings_repo = SettingsRepository(db)

    async def get_attendance_report(self, stage: Optional[str] = None, from_date: Optional[date] = None, to_date: Optional[date] = None) -> List[Dict[str, Any]]:
        return await self.repo.get_attendance_report(stage=stage, from_date=from_date, to_date=to_date)

    async def get_financial_report(self, event_type: Optional[str] = None, from_date: Optional[date] = None, to_date: Optional[date] = None) -> List[Dict[str, Any]]:
        return await self.repo.get_financial_report(event_type=event_type, from_date=from_date, to_date=to_date)

    async def get_followup_report(self) -> Dict[str, Any]:
        return await self.repo.get_followup_report()

    async def get_birthday_report(self, year: Optional[int] = None) -> Dict[str, Any]:
        return await self.repo.get_birthday_report(year=year)

    async def export_report(
        self,
        report_type: str,   # attendance, financials
        export_format: str, # excel, pdf, csv
        stage: Optional[str] = None,
        event_type: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> Tuple[Any, str, str]:
        """
        توليد التصدير الموحد بنفس Dataset ونفس الفلاتر
        تُرجع: (محتوى الملف, MIME Type, اسم الملف)
        """
        church_name = await self.settings_repo.get_setting_value(
            "church_name", "كنيسة السيدة العذراء مريم والأنبا بولا بالمسلة"
        )

        headers_map = {}
        title = ""
        data_list = []
        summary_cards = []

        if report_type == "attendance":
            title = "تقرير نسبة الحضور والانتظام الكنسي"
            data_list = await self.repo.get_attendance_report(stage=stage, from_date=from_date, to_date=to_date)
            headers_map = {
                "session_id": "رمز الجلسة",
                "session_date": "تاريخ الجلسة",
                "stage": "المرحلة الخدمية",
                "session_title": "عنوان الجلسة",
                "targeted_members_count": "الأطفال المستهدفين",
                "present_count": "عدد الحاضرين",
                "attendance_percentage": "نسبة الحضور (%)"
            }

        elif report_type == "financials":
            title = "التقرير المالي للرحلات والأنشطة والخصومات"
            data_list = await self.repo.get_financial_report(event_type=event_type, from_date=from_date, to_date=to_date)
            headers_map = {
                "event_id": "رمز الفعالية",
                "event_title": "عنوان الفعالية",
                "event_type": "نوع الفعالية",
                "event_fee": "سعر الاشتراك الأساسي",
                "registrations_count": "عدد المشتركين",
                "total_base_fee": "إجمالي السعر الأساسي",
                "total_attendance_discount": "إجمالي خصم الحضور",
                "total_points_discount": "إجمالي خصم النقاط",
                "total_amount_due": "صافي المستحق",
                "total_amount_paid": "المحصل فعلياً",
                "total_remaining": "المتبقي"
            }

            # Add financial summary cards for PDF
            t_base = sum(d["total_base_fee"] for d in data_list)
            t_due = sum(d["total_amount_due"] for d in data_list)
            t_paid = sum(d["total_amount_paid"] for d in data_list)
            t_rem = sum(d["total_remaining"] for d in data_list)
            summary_cards = [
                {"label": "إجمالي السعر الأساسي", "value": f"{t_base:.2f} جم"},
                {"label": "صافي المستحق", "value": f"{t_due:.2f} جم"},
                {"label": "المحصل فعلياً", "value": f"{t_paid:.2f} جم"},
                {"label": "المتبقي", "value": f"{t_rem:.2f} جم"}
            ]

        else:
            raise BadRequestException(f"نوع التقرير ({report_type}) غير مدعوم بالتصدير المباشر")

        file_name_prefix = f"report_{report_type}_{datetime.now().strftime('%Y%m%d')}"

        if export_format == "csv":
            content = generate_csv_bytes(data_list, headers_map)
            return content, "text/csv; charset=utf-8", f"{file_name_prefix}.csv"

        elif export_format == "excel":
            content = generate_excel_bytes(data_list, headers_map, title)
            return content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{file_name_prefix}.xlsx"

        elif export_format == "pdf":
            content = generate_pdf_html(data_list, headers_map, title, church_name, summary_cards)
            return content, "text/html; charset=utf-8", f"{file_name_prefix}.html"

        else:
            raise BadRequestException(f"صيغة التصدير ({export_format}) غير مدعومة")
