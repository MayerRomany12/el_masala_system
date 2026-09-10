import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export function AuditLogModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, search, resourceFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (resourceFilter) params.resource_type = resourceFilter;

      const res = await apiClient.get('/audit-logs', { params });
      if (res.data && res.data.data) {
        setLogs(res.data.data.items || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      backdropFilter: 'blur(4px)',
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--card-bg, #1a1e2e)',
        border: '1px solid var(--border-color, #2d3548)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        color: 'var(--text-main, #fff)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color, #2d3548)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#60a5fa' }}>
              🛡️ سجل التدقيق والنشاطات (Audit Logs)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
              تتبع زمني غير قابل للتعديل لكافة العمليات الحساسة بالنظام (إجمالي: {total})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Filters Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid var(--border-color, #2d3548)'
        }}>
          <input
            type="text"
            placeholder="بحث باسم الخادم، المعرف، أو التفاصيل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #2d3548)',
              background: 'var(--bg-input, #0f172a)',
              color: '#fff',
              fontSize: '0.9rem'
            }}
          />
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #2d3548)',
              background: 'var(--bg-input, #0f172a)',
              color: '#fff',
              fontSize: '0.9rem'
            }}
          >
            <option value="">جميع الأقسام</option>
            <option value="Member">الأطفال والمخدومين</option>
            <option value="Attendance">الحضور والجلسات</option>
            <option value="User">الخدام والصلاحيات</option>
            <option value="Event">الرحلات والأنشطة</option>
            <option value="Backup">النسخ الاحتياطي</option>
          </select>
        </div>

        {/* Modal Body / Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              جاري جلب سجل النشاطات...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              لا توجد سجلات تدقيق تطابق خيارات البحث الحالية.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'right' }}>
                  <th style={{ padding: '8px' }}>التاريخ والوقت</th>
                  <th style={{ padding: '8px' }}>الخادم المسؤول</th>
                  <th style={{ padding: '8px' }}>نوع العملية</th>
                  <th style={{ padding: '8px' }}>القسم</th>
                  <th style={{ padding: '8px' }}>التفاصيل</th>
                  <th style={{ padding: '8px' }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.log_id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', dir: 'ltr', textAlign: 'right', color: '#cbd5e1' }}>
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: '600', color: '#f8fafc' }}>
                      {log.user_name || 'النظام التلقائي'}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{
                        background: '#1e293b',
                        color: '#38bdf8',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', color: '#94a3b8' }}>
                      {log.resource_type}
                    </td>
                    <td style={{ padding: '10px 8px', color: '#e2e8f0', maxWidth: '300px' }}>
                      {log.details || '-'}
                    </td>
                    <td style={{ padding: '10px 8px', color: '#64748b', fontSize: '0.8rem', dir: 'ltr' }}>
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color, #2d3548)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#334155',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
