import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../api/reports';
import { apiClient } from '../api/client';
import { getWaUrl } from '../utils/phone';
import {
  FileBarChart,
  Download,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Filter,
  AlertCircle,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Phone,
  ExternalLink,
  BookOpen
} from 'lucide-react';

const STAGE_OPTIONS = [
  'ALL',
  'حضانة',
  'ابتدائي',
  'إعدادي',
  'ثانوي',
  'جامعيين',
  'خريجين'
];

export const ReportManagement = () => {
  const { hasPermission, hasAnyPermission } = useAuth();

  // Active Report Tab: 'members', 'who_attended', 'who_absent', 'attendance', 'financials', 'followup', 'birthdays'
  const [reportType, setReportType] = useState('members');

  // Classes List
  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Filters
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Data States
  const [dataList, setDataList] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Load Classes for Class-centric filtering
  useEffect(() => {
    apiClient.get('/classes/?status=Active&limit=100')
      .then((res) => {
        const items = res?.data?.data?.items || res?.data?.items || [];
        setClassesList(items);
      })
      .catch(() => setClassesList([]));
  }, []);

  // Fetch Report Data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (reportType === 'members') {
        const res = await apiClient.get('/members', {
          params: {
            class_id: selectedClassId || undefined,
            stage: selectedStage && selectedStage !== 'ALL' ? selectedStage : undefined,
            limit: 100
          }
        });
        if (res.data && res.data.success) {
          setDataList(res.data.data.items || []);
          setSummaryData({ total_count: res.data.data.total });
        }
      } else if (reportType === 'who_attended') {
        const res = await reportsApi.getWhoAttendedReport({
          class_id: selectedClassId || null,
          stage: selectedStage && selectedStage !== 'ALL' ? selectedStage : null,
          from_date: fromDate || null,
          to_date: toDate || null
        });
        if (res.success) {
          setDataList(res.data.items || []);
          setSummaryData({ total_count: res.data.total || (res.data.items?.length || 0) });
        }
      } else if (reportType === 'who_absent') {
        const res = await reportsApi.getWhoAbsentReport({
          class_id: selectedClassId || null,
          stage: selectedStage && selectedStage !== 'ALL' ? selectedStage : null,
          from_date: fromDate || null,
          to_date: toDate || null
        });
        if (res.success) {
          setDataList(res.data.items || []);
          setSummaryData({ total_count: res.data.total || (res.data.items?.length || 0) });
        }
      } else if (reportType === 'attendance') {
        const res = await reportsApi.getAttendanceReport({
          class_id: selectedClassId || null,
          stage: selectedStage && selectedStage !== 'ALL' ? selectedStage : null,
          from_date: fromDate || null,
          to_date: toDate || null
        });
        if (res.success) {
          setDataList(res.data.items);
          setSummaryData(null);
        }
      } else if (reportType === 'financials') {
        const res = await reportsApi.getFinancialReport({
          event_type: selectedEventType || null,
          from_date: fromDate || null,
          to_date: toDate || null
        });
        if (res.success) {
          setDataList(res.data.items);
          setSummaryData(res.data.summary);
        }
      } else if (reportType === 'followup') {
        const res = await reportsApi.getFollowupReport();
        if (res.success) {
          setSummaryData(res.data);
          setDataList([]);
        }
      } else if (reportType === 'birthdays') {
        const res = await reportsApi.getBirthdayReport();
        if (res.success) {
          setSummaryData(res.data);
          setDataList([]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر جلب بيانات التقرير');
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedClassId, selectedStage, selectedEventType, fromDate, toDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Export Action with Authenticated Blob Download & Header Filename Extraction
  const handleExport = async (format) => {
    try {
      setExporting(true);
      const params = {};
      if (selectedClassId) params.class_id = selectedClassId;
      if (selectedStage && selectedStage !== 'ALL') params.stage = selectedStage;
      if (selectedEventType && selectedEventType !== 'ALL') params.event_type = selectedEventType;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await reportsApi.downloadExport(reportType, format, params);

      // Extract filename from Content-Disposition header if returned
      let filename = `report_${reportType}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : (format === 'csv' ? 'csv' : 'html')}`;
      const disposition = res.headers ? (res.headers['content-disposition'] || res.headers['Content-Disposition']) : null;
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '').trim();
        }
      }

      const mimeType = format === 'pdf'
        ? 'text/html;charset=utf-8;'
        : (format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8;');

      const blob = new Blob([res.data], { type: mimeType });
      const blobUrl = window.URL.createObjectURL(blob);

      if (format === 'pdf') {
        // Open printable preview in new tab
        const printWin = window.open(blobUrl, '_blank');
        if (!printWin) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          a.click();
        }
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      alert('فشل تنزيل التقرير. يرجى التحقق من الصلاحيات والاتصال بالسيرفر.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileBarChart size={28} style={{ color: 'var(--color-gold-main)' }} />
            <span>نظام التقارير الشاملة والإحصائيات الكنسية</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            سجلات تفصيلية وإحصائيات موحدة من واقع قاعدة البيانات مع إمكانية التصدير والطباعة
          </p>
        </div>

        {/* Unified Export Buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {hasPermission('reports:export') && (
            <>
              <button
                onClick={() => handleExport('excel')}
                disabled={exporting}
                className="btn btn-secondary"
                style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)', gap: '0.4rem' }}
                title="تحميل ملف إكسل منسق عربي RTL"
              >
                <FileSpreadsheet size={17} />
                <span>{exporting ? 'جاري التصدير...' : 'تحميل Excel 📊'}</span>
              </button>

              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="btn btn-primary"
                style={{ gap: '0.4rem' }}
                title="معاينة وتصدير تقرير رسمي مروس بشعار الكنيسة جاهز للطباعة"
              >
                <Printer size={17} />
                <span>معاينة / طباعة التقرير (Print / PDF) 📄</span>
              </button>

              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="btn btn-secondary"
                style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', gap: '0.4rem' }}
                title="تحميل ملف بيانات CSV خام بترميز UTF-8 BOM"
              >
                <Download size={17} />
                <span>تحميل CSV 📁</span>
              </button>
            </>
          )}

          <button onClick={fetchReportData} className="btn btn-secondary" disabled={loading} title="تحديث البيانات">
            <RefreshCw size={16} className={loading ? 'pulse-gold' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Report Type Tabs */}
      <div className="glass-card" style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {hasPermission('members:read') && (
          <button
            onClick={() => setReportType('members')}
            className={`btn ${reportType === 'members' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}
          >
            سجل المخدومين الشامل 📜
          </button>
        )}

        {hasAnyPermission(['attendance:scan', 'attendance:session']) && (
          <button
            onClick={() => setReportType('who_attended')}
            className={`btn ${reportType === 'who_attended' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem', whiteSpace: 'nowrap', color: reportType === 'who_attended' ? '#fff' : '#34d399' }}
          >
            كشف الحاضرين (مين حضر) ✅
          </button>
        )}

        {hasAnyPermission(['attendance:scan', 'attendance:session']) && (
          <button
            onClick={() => setReportType('who_absent')}
            className={`btn ${reportType === 'who_absent' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem', whiteSpace: 'nowrap', color: reportType === 'who_absent' ? '#fff' : '#f87171' }}
          >
            كشف الغائبين (مين غاب) ❌
          </button>
        )}

        {hasAnyPermission(['attendance:scan', 'attendance:session']) && (
          <button
            onClick={() => setReportType('attendance')}
            className={`btn ${reportType === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}
          >
            تقرير الحضور والانتظام 📊
          </button>
        )}

        {hasPermission('reports:read') && (
          <button
            onClick={() => setReportType('financials')}
            className={`btn ${reportType === 'financials' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}
          >
            التقرير المالي للرحلات والأنشطة 💳
          </button>
        )}

        {hasPermission('followup:read') && (
          <button
            onClick={() => setReportType('followup')}
            className={`btn ${reportType === 'followup' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}
          >
            تقرير متابعة الغياب والافتقاد 🤝
          </button>
        )}

        {hasPermission('birthdays:read') && (
          <button
            onClick={() => setReportType('birthdays')}
            className={`btn ${reportType === 'birthdays' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}
          >
            تقرير أعياد الميلاد وتوزيع الهدايا 🎁
          </button>
        )}
      </div>

      {/* 3. Filters Toolbar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-gold-light)', fontWeight: 700, fontSize: '0.88rem' }}>
          <Filter size={18} />
          <span>تصفية التقرير:</span>
        </div>

        {/* Class Filter */}
        {(reportType === 'members' || reportType === 'who_attended' || reportType === 'who_absent' || reportType === 'attendance') && (
          <div style={{ flex: '0 1 200px' }}>
            <select
              className="form-input"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">جميع الفصول 🏫</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {(reportType === 'members' || reportType === 'who_attended' || reportType === 'who_absent' || reportType === 'attendance') && (
          <div style={{ flex: '0 1 200px' }}>
            <select
              className="form-input"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
            >
              <option value="">جميع المراحل الدراسية</option>
              {STAGE_OPTIONS.filter(s => s !== 'ALL').map((stg) => (
                <option key={stg} value={stg}>{stg}</option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'financials' && (
          <div style={{ flex: '0 1 200px' }}>
            <select
              className="form-input"
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
            >
              <option value="">كل أنواع الأنشطة</option>
              <option value="Trip">رحلات 🚌</option>
              <option value="Event">مؤتمرات وأنشطة 🎪</option>
              <option value="Meeting">اجتماعات مدارس الأحد ⛪</option>
            </select>
          </div>
        )}

        {(reportType === 'attendance' || reportType === 'who_attended' || reportType === 'who_absent' || reportType === 'financials') && (
          <>
            <div style={{ flex: '0 1 160px' }}>
              <input
                type="date"
                className="form-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="من تاريخ"
                title="من تاريخ"
              />
            </div>

            <div style={{ flex: '0 1 160px' }}>
              <input
                type="date"
                className="form-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="إلى تاريخ"
                title="إلى تاريخ"
              />
            </div>
          </>
        )}
      </div>

      {/* Summary Banner for Who Attended */}
      {reportType === 'who_attended' && summaryData && (
        <div className="glass-card animate-fade-in" style={{ padding: '1rem 1.5rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={24} style={{ color: '#34d399' }} />
            <div>
              <strong style={{ fontSize: '1.2rem', color: '#34d399', display: 'block' }}>
                كشف الحاضرين ({summaryData.total_count || dataList.length} مخدوم)
              </strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                قائمة الأطفال الذين حضروا الجلسات من واقع الكشوفات المسجلة
              </span>
            </div>
          </div>
          <button
            onClick={() => handleExport('pdf')}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            <Printer size={16} /> طباعة كشف الحاضرين الرسمي (PDF)
          </button>
        </div>
      )}

      {/* Summary Banner for Who Absent */}
      {reportType === 'who_absent' && summaryData && (
        <div className="glass-card animate-fade-in" style={{ padding: '1rem 1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <XCircle size={24} style={{ color: '#f87171' }} />
            <div>
              <strong style={{ fontSize: '1.2rem', color: '#f87171', display: 'block' }}>
                كشف الغائبين المستهدفين للافتقاد ({summaryData.total_count || dataList.length} مخدوم)
              </strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                قائمة الأطفال الغائبين لسرعة الافتقاد والتواصل المباشر مع أولياء الأمور
              </span>
            </div>
          </div>
          <button
            onClick={() => handleExport('pdf')}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
          >
            <Printer size={16} /> طباعة كشف الغياب للافتقاد (PDF)
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Financial Explicit 6 Metrics Summary Banner */}
      {reportType === 'financials' && summaryData && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.25rem', background: 'linear-gradient(145deg, rgba(59, 0, 11, 0.6) 0%, rgba(13, 5, 8, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.35)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي السعر الأساسي</span>
            <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>{summaryData.total_base_fee} جم</strong>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي خصم الحضور</span>
            <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>-{summaryData.total_attendance_discount} جم</strong>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي خصم النقاط</span>
            <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24' }}>-{summaryData.total_points_discount} جم</strong>
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.12)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <span style={{ fontSize: '0.78rem', color: '#38bdf8', display: 'block', fontWeight: 700 }}>صافي المبلغ المستحق (amount_due)</span>
            <strong style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8' }}>{summaryData.total_amount_due} جم</strong>
          </div>

          <div style={{ background: 'rgba(52, 211, 153, 0.12)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
            <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'block', fontWeight: 700 }}>المحصل فعلياً (amount_paid)</span>
            <strong style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399' }}>{summaryData.total_amount_paid} جم</strong>
          </div>

          <div style={{ background: 'rgba(248, 113, 113, 0.12)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
            <span style={{ fontSize: '0.78rem', color: '#f87171', display: 'block', fontWeight: 700 }}>المتبقي التحصيل</span>
            <strong style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f87171' }}>{summaryData.total_remaining} جم</strong>
          </div>
        </div>
      )}

      {/* 5. Report Table Renderers */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {/* Members Master Directory Table */}
        {reportType === 'members' && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>رمز المخدوم</th>
                  <th>الاسم الكامل للطفل</th>
                  <th>الفصول المسكن بها</th>
                  <th>المرحلة</th>
                  <th>تاريخ الميلاد</th>
                  <th>تليفون ولي الأمر</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>جاري استعلام سجل المخدومين...</td>
                  </tr>
                ) : dataList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا يوجد أطفال مسجلين مطابقين للتصفية.</td>
                  </tr>
                ) : (
                  dataList.map((row) => (
                    <tr key={row.member_id}>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>{row.member_id}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.full_name}</td>
                      <td>
                        {row.active_classes && row.active_classes.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {row.active_classes.map((ac) => (
                              <span
                                key={ac.class_id}
                                className="badge"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.15rem 0.45rem',
                                  background: ac.group_type === 'Summer' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(122, 8, 29, 0.25)',
                                  color: ac.group_type === 'Summer' ? '#fbbf24' : 'var(--color-gold-light)',
                                  border: '1px solid rgba(212, 175, 55, 0.3)'
                                }}
                              >
                                {ac.class_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>
                      <td>{row.stage || 'عام'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{row.date_of_birth || '—'}</td>
                      <td>
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{row.phone}</span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: row.status === 'Active' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(239, 68, 68, 0.18)', color: row.status === 'Active' ? '#34d399' : '#f87171' }}>
                          {row.status === 'Active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Who Attended Report Table */}
        {reportType === 'who_attended' && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>م</th>
                  <th>رمز المخدوم</th>
                  <th>اسم المخدوم الكامل</th>
                  <th>الفصل</th>
                  <th>المرحلة</th>
                  <th>المنطقة السكنية</th>
                  <th>الهاتف</th>
                  <th>تاريخ الجلسة</th>
                  <th>طريقة التسجيل</th>
                  <th style={{ textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>جاري استخراج كشف الحاضرين...</td>
                  </tr>
                ) : dataList.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا يوجد حضور مطابق للتصفية.</td>
                  </tr>
                ) : (
                  dataList.map((row, idx) => (
                    <tr key={`${row.member_id}-${row.session_date}-${idx}`}>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--color-gold-light)' }}>
                        {row.index || (idx + 1)}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                          {row.member_id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.full_name}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(212, 175, 55, 0.15)', color: 'var(--color-gold-light)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                          {row.class_name || '—'}
                        </span>
                      </td>
                      <td>{row.stage || '—'}</td>
                      <td>
                        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{row.area || '—'}</span>
                      </td>
                      <td>
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{row.phone || '—'}</span>
                      </td>
                      <td>{row.session_date || '—'}</td>
                      <td>
                        <span className="badge" style={{ background: row.method === 'qr' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)', color: row.method === 'qr' ? '#38bdf8' : '#34d399' }}>
                          {row.method === 'qr' ? 'مسح QR 📱' : 'يدوي (الكشف) ✍️'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => window.open(reportsApi.getMemberProfilePrintUrl(row.member_id), '_blank')}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', gap: '0.25rem' }}
                          title="طباعة استمارة المخدوم الشاملة"
                        >
                          <Printer size={13} /> استمارة
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Who Absent Report Table */}
        {reportType === 'who_absent' && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>م</th>
                  <th>رمز المخدوم</th>
                  <th>اسم المخدوم الكامل</th>
                  <th>الفصل</th>
                  <th>المرحلة</th>
                  <th>المنطقة السكنية</th>
                  <th>الهاتف</th>
                  <th>تاريخ جلسة الغياب</th>
                  <th style={{ textAlign: 'center' }}>تواصل وافتقاد</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>جاري استخراج كشف الغائبين...</td>
                  </tr>
                ) : dataList.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#34d399' }}>ممتاز! لا يوجد غياب في الجلسات المحددة. 🎉</td>
                  </tr>
                ) : (
                  dataList.map((row, idx) => (
                    <tr key={`${row.member_id}-${row.session_date}-${idx}`}>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#f87171' }}>
                        {row.index || (idx + 1)}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                          {row.member_id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.full_name}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(212, 175, 55, 0.15)', color: 'var(--color-gold-light)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                          {row.class_name || '—'}
                        </span>
                      </td>
                      <td>{row.stage || '—'}</td>
                      <td>
                        <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>{row.area || '—'}</span>
                      </td>
                      <td>
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{row.phone || '—'}</span>
                      </td>
                      <td>
                        <span style={{ color: '#fca5a5', fontWeight: 600 }}>{row.session_date || '—'}</span>
                        {row.session_title && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                            {row.session_title}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          {row.phone && (
                            <a
                              href={getWaUrl(row.whatsapp_phone || row.phone, `سلام ونعمة يا فندم، كنا بنطمن على ${row.full_name} لغيابه عن اجتماع مدارس الأحد بكنيسة الشهيد مارجرجس والأنبا شنودة بالكرور`)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)' }}
                              title="تواصل واتساب مباشر للافتقاد"
                            >
                              <MessageCircle size={13} /> واتساب
                            </a>
                          )}
                          {row.phone && (
                            <a
                              href={`tel:${row.phone}`}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.78rem', padding: '0.25rem 0.45rem' }}
                              title="اتصال هاتفي"
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => window.open(reportsApi.getMemberProfilePrintUrl(row.member_id), '_blank')}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.45rem' }}
                            title="طباعة استمارة المخدوم الشاملة"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Attendance Report Table */}
        {reportType === 'attendance' && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>رمز الجلسة</th>
                  <th>تاريخ الجلسة</th>
                  <th>المرحلة الخدمية</th>
                  <th>عنوان الجلسة</th>
                  <th>الأطفال المستهدفين</th>
                  <th>عدد الحاضرين</th>
                  <th>نسبة الحضور (%)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>جاري استعلام تقرير الحضور...</td>
                  </tr>
                ) : dataList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا توجد جلسات مطابقة للفلاتر.</td>
                  </tr>
                ) : (
                  dataList.map((row) => (
                    <tr key={row.session_id}>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>{row.session_id}</span></td>
                      <td>{row.session_date}</td>
                      <td>{row.stage}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.session_title}</td>
                      <td><strong style={{ color: '#cbd5e1' }}>{row.targeted_members_count} طفل</strong></td>
                      <td><strong style={{ color: '#34d399' }}>{row.present_count} طفل</strong></td>
                      <td>
                        <span className="badge" style={{ background: row.attendance_percentage >= 75 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)', color: row.attendance_percentage >= 75 ? '#34d399' : '#fbbf24', fontWeight: 800 }}>
                          {row.attendance_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Financial Report Table (6 Metrics) */}
        {reportType === 'financials' && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>رمز الفعالية</th>
                  <th>عنوان الفعالية</th>
                  <th>نوع الفعالية</th>
                  <th>سعر الفرد الأساسي</th>
                  <th>المشتركين</th>
                  <th>إجمالي الأساسي</th>
                  <th>خصم الحضور</th>
                  <th>خصم النقاط</th>
                  <th>صافي المستحق</th>
                  <th>المحصل</th>
                  <th>المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '2rem' }}>جاري استعلام التقرير المالي...</td>
                  </tr>
                ) : dataList.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا توجد فعاليات مطابقة.</td>
                  </tr>
                ) : (
                  dataList.map((row) => (
                    <tr key={row.event_id}>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>{row.event_id}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.event_title}</td>
                      <td>{row.event_type}</td>
                      <td>{row.event_fee} جم</td>
                      <td><strong style={{ color: '#cbd5e1' }}>{row.registrations_count}</strong></td>
                      <td>{row.total_base_fee} جم</td>
                      <td style={{ color: '#34d399' }}>-{row.total_attendance_discount} جم</td>
                      <td style={{ color: '#fbbf24' }}>-{row.total_points_discount} جم</td>
                      <td style={{ fontWeight: 800, color: '#38bdf8' }}>{row.total_amount_due} جم</td>
                      <td style={{ fontWeight: 800, color: '#34d399' }}>{row.total_amount_paid} جم</td>
                      <td style={{ fontWeight: 800, color: row.total_remaining > 0 ? '#f87171' : '#34d399' }}>
                        {row.total_remaining} جم
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Followup Summary Display */}
        {reportType === 'followup' && summaryData && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي حالات الغياب المترسبة</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-main)' }}>{summaryData.total_active_tasks} حالة</strong>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                <span style={{ fontSize: '0.78rem', color: '#fbbf24', display: 'block', fontWeight: 700 }}>المهام المعلقة قيد المتابعة</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24' }}>{summaryData.pending_tasks_count} مهمة</strong>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'block', fontWeight: 700 }}>حالات تم افتقادها بنجاح</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: '#34d399' }}>{summaryData.completed_tasks_count} حالة</strong>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <span style={{ fontSize: '0.78rem', color: '#f87171', display: 'block', fontWeight: 700 }}>حالات عاجلة متصاعدة للأمين</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171' }}>{summaryData.escalated_tasks_count} حالة</strong>
              </div>
            </div>
          </div>
        )}

        {/* Birthday Summary Display */}
        {reportType === 'birthdays' && summaryData && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي المستحقين لهدايا لسنة {summaryData.year}</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-main)' }}>{summaryData.total_eligible_children} طفل</strong>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'block', fontWeight: 700 }}>تم تسليم هداياهم 🟢</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: '#34d399' }}>{summaryData.delivered_gifts_count} طفل</strong>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                <span style={{ fontSize: '0.78rem', color: '#fbbf24', display: 'block', fontWeight: 700 }}>في انتظار التسليم 🟡</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24' }}>{summaryData.pending_gifts_count} طفل</strong>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', display: 'block', fontWeight: 700 }}>نسبة تسليم الهدايا السنوية</span>
                <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38bdf8' }}>{summaryData.delivery_rate_pct}%</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportManagement;
