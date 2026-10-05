import io
import csv
from typing import List, Dict, Any, Optional
from datetime import datetime


def generate_csv_bytes(data_list: List[Dict[str, Any]], headers_map: Dict[str, str]) -> bytes:
    """
    توليد ملف CSV مع إضافة UTF-8 BOM (\xef\xbb\xbf) لفتح اللغة العربية تلقائياً وبدقة ببرنامج Excel
    """
    output = io.StringIO()
    # Add UTF-8 BOM for Arabic support in Excel
    output.write('\ufeff')

    writer = csv.writer(output)
    
    # Write Headers
    header_keys = list(headers_map.keys())
    header_labels = list(headers_map.values())
    writer.writerow(header_labels)

    # Write Rows
    for row in data_list:
        line = [str(row.get(k, '')) for k in header_keys]
        writer.writerow(line)

    return output.getvalue().encode('utf-8')


def generate_excel_bytes(data_list: List[Dict[str, Any]], headers_map: Dict[str, str], title: str) -> bytes:
    """
    توليد ملف Excel (.xlsx) منسق بخلايا ملونة باللغة العربية RTL
    """
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = title[:30]
        ws.views.sheetView[0].rightToLeft = True # RTL

        # Styles
        header_fill = PatternFill(start_color="7A081D", end_color="7A081D", fill_type="solid") # Church Maroon
        header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
        cell_font = Font(name="Segoe UI", size=10)
        align_right = Alignment(horizontal="right", vertical="center")
        align_center = Alignment(horizontal="center", vertical="center")

        thin_border = Border(
            left=Side(style='thin', color='D4AF37'),
            right=Side(style='thin', color='D4AF37'),
            top=Side(style='thin', color='D4AF37'),
            bottom=Side(style='thin', color='D4AF37')
        )

        # Title Row
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers_map))
        title_cell = ws.cell(row=1, column=1, value=title)
        title_cell.font = Font(name="Segoe UI", size=14, bold=True, color="7A081D")
        title_cell.alignment = align_center

        # Header Row
        header_keys = list(headers_map.keys())
        for col_idx, k in enumerate(header_keys, 1):
            cell = ws.cell(row=3, column=col_idx, value=headers_map[k])
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = align_center
            cell.border = thin_border

        # Data Rows
        for row_idx, row_data in enumerate(data_list, 4):
            for col_idx, k in enumerate(header_keys, 1):
                val = row_data.get(k, '')
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = cell_font
                cell.alignment = align_right
                cell.border = thin_border

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 5, 14)

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()
    except ImportError:
        # Fallback to CSV if openpyxl not installed
        return generate_csv_bytes(data_list, headers_map)


def generate_pdf_html(
    data_list: List[Dict[str, Any]],
    headers_map: Dict[str, str],
    title: str,
    church_name: str,
    summary_cards: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    توليد وثيقة HTML/PDF مروسة رسمياً بشعار واسم الكنيسة مخصصة للطباعة والتصدير
    """
    now_str = datetime.now().strftime("%Y/%m/%d - %I:%M %p")
    header_keys = list(headers_map.keys())

    cards_html = ""
    if summary_cards:
        cards_html = '<div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">'
        for c in summary_cards:
            cards_html += f'''
            <div style="flex: 1; min-width: 180px; padding: 12px 15px; background: #f0f9ff; border: 1px solid #facc15; border-radius: 8px; text-align: center;">
                <div style="font-size: 12px; color: #0284c7; font-weight: bold;">{c.get("label")}</div>
                <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">{c.get("value")}</div>
            </div>
            '''
        cards_html += '</div>'

    rows_html = ""
    for idx, row in enumerate(data_list, 1):
        rows_html += '<tr>'
        for k in header_keys:
            val = row.get(k, '')
            rows_html += f'<td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">{val}</td>'
        rows_html += '</tr>'

    headers_html = "".join([f'<th style="padding: 10px 12px; background: #0284c7; color: #fef08a; text-align: right;">{headers_map[k]}</th>' for k in header_keys])

    html_content = f'''<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8">
    <title>{title}</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; color: #222; margin: 0; padding: 20px; }}
        .header-box {{ display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #facc15; padding-bottom: 15px; margin-bottom: 20px; }}
        .logo-title {{ display: flex; align-items: center; gap: 15px; }}
        .title-main {{ font-size: 20px; font-weight: 900; color: #0284c7; margin: 0; }}
        .sub-title {{ font-size: 13px; color: #64748b; margin-top: 4px; font-weight: bold; }}
        .date-box {{ font-size: 11px; color: #64748b; text-align: left; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }}
        .footer-note {{ margin-top: 30px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; }}
        @media print {{
            body {{ padding: 0; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 15px; text-align: left;">
        <button onclick="window.print()" style="padding: 8px 18px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border: 1px solid #facc15; color: #fff; border-radius: 6px; cursor: pointer; font-weight: bold;">
            طباعة التقرير / حفظ PDF 🖨️
        </button>
    </div>

    <div class="header-box">
        <div class="logo-title">
            <div>
                <h1 class="title-main">{church_name}</h1>
                <div class="sub-title">خدمة مدارس الأحد بالكرور — {title}</div>
            </div>
        </div>
        <div class="date-box">
            <div>تاريخ التصدير: {now_str}</div>
            <div>تقرير كنسي معتمد</div>
        </div>
    </div>

    {cards_html}

    <table>
        <thead>
            <tr>{headers_html}</tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>

    <div class="footer-note">
        تم استخراج هذا التقرير آلياً من منظومة الخدمة — كنيسة الشهيد العظيم مارجرجس الروماني والأنبا شنودة رئيس المتوحدين بعزبة شنوده الكرور - أسوان.
    </div>
</body>
</html>'''
    return html_content


def generate_member_profile_html(
    member: Dict[str, Any],
    history: Dict[str, Any],
    church_name: str
) -> str:
    """
    توليد وثيقة بروفايل رسمية للمخدوم مع سجل حضوره وغيابه وبياناته بالكامل للطباعة والـ PDF
    """
    now_str = datetime.now().strftime("%Y/%m/%d - %I:%M %p")
    photo_src = member.get("photo_url")
    if not photo_src:
        photo_html = '<div style="width:110px; height:110px; border-radius:50%; background:#e0f2fe; border:3px solid #0284c7; display:flex; align-items:center; justify-content:center; font-size:36px; color:#0284c7; font-weight:bold;">✝</div>'
    else:
        photo_html = f'<img src="{photo_src}" style="width:110px; height:110px; border-radius:50%; object-fit:cover; border:3px solid #0284c7; box-shadow:0 4px 10px rgba(0,0,0,0.15);" />'

    classes_str = "، ".join([c["class_name"] for c in member.get("active_classes", [])]) or "غير مسكن"
    summary = history.get("summary") or history
    timeline = history.get("timeline") or []

    timeline_rows = ""
    for idx, item in enumerate(timeline[:15], 1):
        status_badge = '<span style="color:#16a34a; font-weight:bold;">✓ حاضر</span>' if item.get("attended") else '<span style="color:#dc2626; font-weight:bold;">✗ غائب</span>'
        timeline_rows += f'''
        <tr>
            <td style="padding:6px 10px; border-bottom:1px solid #e2e8f0; text-align:center;">{idx}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #e2e8f0;">{item.get("session_date", "")}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #e2e8f0;">{item.get("class_name", "")}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #e2e8f0;">{item.get("title", "")}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #e2e8f0; text-align:center;">{status_badge}</td>
        </tr>
        '''

    phone_val = member.get("phone") or ""
    wa_val = member.get("whatsapp_phone") or ""
    phone_digits = "".join(filter(str.isdigit, phone_val))
    wa_digits = "".join(filter(str.isdigit, wa_val))

    if wa_val and wa_digits and wa_digits != phone_digits:
        phone_html = f'''<div><strong>رقم ولي الأمر:</strong> {phone_val or "—"}</div>
                <div><strong>رقم واتساب إضافي:</strong> {wa_val}</div>'''
    else:
        phone_html = f'''<div><strong>رقم ولي الأمر والواتساب:</strong> {phone_val or "—"}</div>'''

    html_content = f'''<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8">
    <title>ملف المخدوم — {member.get("full_name")}</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; color: #1e293b; margin: 0; padding: 25px; }}
        .header-box {{ display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #facc15; padding-bottom: 12px; margin-bottom: 20px; }}
        .title-main {{ font-size: 19px; font-weight: 900; color: #0284c7; margin: 0; }}
        .sub-title {{ font-size: 13px; color: #64748b; margin-top: 4px; font-weight: bold; }}
        .card-box {{ border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; background: #f8fafc; }}
        .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }}
        .stat-card {{ flex: 1; padding: 10px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }}
        th {{ background: #0284c7; color: #fff; padding: 8px 10px; text-align: right; }}
        @media print {{
            body {{ padding: 0; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 15px; text-align: left;">
        <button onclick="window.print()" style="padding: 9px 20px; background: #0284c7; border: 1px solid #facc15; color: #fff; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
            طباعة الملف / حفظ كـ PDF 🖨️
        </button>
    </div>

    <div class="header-box">
        <div>
            <h1 class="title-main">{church_name}</h1>
            <div class="sub-title">خدمة مدارس الأحد — الاستمارة والملف الشامل للمخدوم</div>
        </div>
        <div style="font-size: 11px; color: #64748b; text-align: left;">
            <div>تاريخ الاستخراج: {now_str}</div>
            <div>كود العضوية: <strong>{member.get("member_id")}</strong></div>
        </div>
    </div>

    <!-- Personal Profile Section -->
    <div class="card-box" style="display: flex; gap: 20px; align-items: center;">
        <div>{photo_html}</div>
        <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h2 style="margin: 0; font-size: 20px; color: #0f172a;">{member.get("full_name")}</h2>
                <span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 12px;">{member.get("stage")}</span>
            </div>
            <div class="grid-2">
                <div><strong>الفصول الخدمية:</strong> {classes_str}</div>
                <div><strong>المنطقة السكنية:</strong> {member.get("area") or "غير محدد"}</div>
                {phone_html}
                <div><strong>البريد الإلكتروني:</strong> {member.get("email") or "—"}</div>
                <div><strong>أب الاعتراف:</strong> {member.get("father_of_confession") or "—"}</div>
                <div><strong>تاريخ الميلاد:</strong> {str(member.get("date_of_birth") or "—")}</div>
                <div><strong>العنوان:</strong> {member.get("address") or "—"}</div>
            </div>
        </div>
    </div>

    <!-- Attendance Stats Summary -->
    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <div class="stat-card">
            <div style="font-size: 12px; color: #64748b;">إجمالي الجلسات</div>
            <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">{summary.get("total_sessions", 0)}</div>
        </div>
        <div class="stat-card" style="border-top: 3px solid #16a34a;">
            <div style="font-size: 12px; color: #16a34a; font-weight: bold;">عدد مرات الحضور</div>
            <div style="font-size: 20px; font-weight: 900; color: #16a34a; margin-top: 4px;">{summary.get("attended_count", 0)}</div>
        </div>
        <div class="stat-card" style="border-top: 3px solid #dc2626;">
            <div style="font-size: 12px; color: #dc2626; font-weight: bold;">عدد مرات الغياب</div>
            <div style="font-size: 20px; font-weight: 900; color: #dc2626; margin-top: 4px;">{summary.get("absent_count", 0)}</div>
        </div>
        <div class="stat-card" style="border-top: 3px solid #0284c7;">
            <div style="font-size: 12px; color: #0284c7; font-weight: bold;">نسبة الانتظام</div>
            <div style="font-size: 20px; font-weight: 900; color: #0284c7; margin-top: 4px;">{summary.get("attendance_rate", 0)}%</div>
        </div>
    </div>

    <!-- Recent Attendance Records Table -->
    <h3 style="font-size: 14px; margin-bottom: 6px; color: #0284c7;">سجل آخر الجلسات والحضور</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 40px; text-align: center;">م</th>
                <th>تاريخ الجلسة</th>
                <th>الفصل / الاجتماع</th>
                <th>عنوان الجلسة</th>
                <th style="width: 90px; text-align: center;">حالة الحضور</th>
            </tr>
        </thead>
        <tbody>
            {timeline_rows or '<tr><td colspan="5" style="text-align:center; padding:15px;">لا توجد جلسات مسجلة بعد</td></tr>'}
        </tbody>
    </table>

    <!-- Signature Section -->
    <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 13px; font-weight: bold; color: #475569;">
        <div>توقيع خادم الفصل: .........................</div>
        <div>توقيع أمين الخدمة: .........................</div>
        <div>توقيع كاهن الكنيسة: .........................</div>
    </div>
</body>
</html>'''
    return html_content

