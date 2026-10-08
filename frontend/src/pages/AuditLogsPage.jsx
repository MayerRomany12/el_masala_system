import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit
      };
      if (search.trim()) params.search = search.trim();
      if (resourceFilter) params.resource_type = resourceFilter;
      if (actionFilter) params.action = actionFilter;

      const res = await apiClient.get('/audit-logs', { params });
      if (res.data && res.data.data) {
        setLogs(res.data.data.items || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, resourceFilter, actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATE') || action.includes('ENROLL') || action.includes('ASSIGN')) {
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
    }
    if (action.includes('UPDATE') || action.includes('TRANSFER') || action.includes('DISTRIBUTE')) {
      return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    }
    if (action.includes('DELIVER')) {
      return { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' };
    }
    if (action.includes('DELETE') || action.includes('REMOVE') || action.includes('ARCHIVE')) {
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
    }
    return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' };
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={26} color="#38bdf8" />
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              سجل نشاطات النظام والعمليات (Audit Logs)
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            تتبع زمني شامل وموثق لكافة حركات الخدام والمسؤولين (مين ضاف، مين عدل، مين سلم هدية، مين وزع افتقاد)
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn btn-secondary"
          style={{ gap: '6px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="ابحث بالاسم، المعرف، أو تفاصيل العملية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <select
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            className="form-input"
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">جميع الأقسام</option>
            <option value="Member">الأعضاء والمخدومين</option>
            <option value="Class">الفصول والمجموعات</option>
            <option value="Followup">الافتقاد والمتابعة</option>
            <option value="Birthday">أعياد الميلاد والهدايا</option>
            <option value="Attendance">تسجيل الحضور والجلسات</option>
            <option value="User">المستخدمين والخدام</option>
            <option value="Backup">النسخ الاحتياطي</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="form-input"
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">جميع أنواع العمليات</option>
            <option value="CREATE_MEMBER">إضافة مخدوم</option>
            <option value="UPDATE_MEMBER">تعديل مخدوم</option>
            <option value="ARCHIVE_MEMBER">أرشفة مخدوم</option>
            <option value="DELIVER_GIFT">تسليم هدية عيد ميلاد</option>
            <option value="CREATE_CLASS">إنشاء فصل</option>
            <option value="UPDATE_CLASS">تعديل اسم/بيانات فصل</option>
            <option value="ASSIGN_SERVANT">تسكين خادم بفصل</option>
            <option value="REMOVE_SERVANT">إخراج خادم من فصل</option>
            <option value="DISTRIBUTE_FOLLOWUP">توزيع افتقاد الفصل</option>
            <option value="AUTO_DISTRIBUTE_FOLLOWUP">كشف وتوزيع افتقاد آلي</option>
            <option value="LOG_FOLLOWUP">توثيق نتيجة افتقاد</option>
            <option value="CREATE_USER">إنشاء حساب مستخدم</option>
            <option value="UPDATE_USER">تعديل بيانات مستخدم</option>
          </select>

          <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
            <Filter size={15} />
            <span>تصفية</span>
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            سجل العمليات المسجلة ({total} عملية)
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            صفحة {page} من {totalPages}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            جاري جلب سجل النشاطات...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            لا توجد سجلات تطابق خيارات البحث المحددة.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px' }}>التاريخ والوقت</th>
                  <th style={{ padding: '12px 14px' }}>الخادم / الحساب المسؤول</th>
                  <th style={{ padding: '12px 14px' }}>نوع العملية</th>
                  <th style={{ padding: '12px 14px' }}>القسم</th>
                  <th style={{ padding: '12px 14px' }}>التفاصيل ومحتوى الحركة</th>
                  <th style={{ padding: '12px 14px' }}>عنوان IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = getActionBadgeColor(log.action || '');
                  return (
                    <tr key={log.log_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', dir: 'ltr', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="#38bdf8" />
                          <span>{log.user_name || 'النظام التلقائي'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-block'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
                        {log.resource_type}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#e2e8f0', maxWidth: '400px', lineHeight: 1.5 }}>
                        {log.details || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.78rem', dir: 'ltr' }}>
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
            >
              <ChevronRight size={15} />
              <span>السابق</span>
            </button>
            <span style={{ padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
            >
              <span>التالي</span>
              <ChevronLeft size={15} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
