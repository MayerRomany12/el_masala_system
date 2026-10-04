import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { followupApi } from '../api/followup';
import { getWaUrl } from '../utils/phone';
import { WhatsAppButton } from '../components/WhatsAppButton';
import {
  HeartHandshake,
  Search,
  RefreshCw,
  Plus,
  Phone,
  MessageSquare,
  Home,
  Church,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  UserCheck,
  X,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  FileText,
  Send,
  MapPin,
  Printer,
  Layers,
  Calendar
} from 'lucide-react';

export const FollowupManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [tasksByArea, setTasksByArea] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaLoading, setAreaLoading] = useState(false);
  const [error, setError] = useState('');

  // View Mode: 'list' or 'area'
  const [viewMode, setViewMode] = useState('list');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Summary Metrics
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    pendingCount: 0,
    urgentCount: 0,
    completedCount: 0
  });

  // Detector State
  const [detecting, setDetecting] = useState(false);
  const [detectMessage, setDetectMessage] = useState('');

  // Log Follow-Up Drawer/Modal
  const [activeLogTask, setActiveLogTask] = useState(null);
  const [logFormData, setLogFormData] = useState({
    contact_method: 'Phone',
    outcome: 'Promised',
    notes: ''
  });
  const [logLoading, setLogLoading] = useState(false);

  // History Logs Modal
  const [historyTask, setHistoryTask] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);

  // Load classes
  useEffect(() => {
    apiClient.get('/classes/?status=Active&limit=100')
      .then(res => {
        const items = res?.data?.data?.items || res?.data?.items || [];
        setClassesList(items);
      })
      .catch(() => setClassesList([]));
  }, []);

  // Fetch Followup Tasks (List View)
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await followupApi.getTasks({
        search: searchTerm || undefined,
        class_id: selectedClassId || undefined,
        priority: selectedPriority || undefined,
        status: selectedStatus || undefined,
        limit: 100
      });
      if (res.success) {
        setTasks(res.data.items || []);

        let pending = 0;
        let urgent = 0;
        let completed = 0;
        (res.data.items || []).forEach(t => {
          if (t.status === 'Pending') pending++;
          if (t.status === 'Completed') completed++;
          if (t.priority === 'Urgent' || t.status === 'Escalated') urgent++;
        });

        setMetrics({
          totalTasks: res.data.total || (res.data.items || []).length,
          pendingCount: pending,
          urgentCount: urgent,
          completedCount: completed
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر تحميل مهام الافتقاد');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedClassId, selectedPriority, selectedStatus]);

  // Fetch Tasks Grouped By Area
  const fetchTasksByArea = useCallback(async () => {
    setAreaLoading(true);
    try {
      const res = await followupApi.getTasksByArea({
        class_id: selectedClassId || undefined,
        status: selectedStatus || undefined
      });
      if (res.success) {
        setTasksByArea(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching tasks by area:', err);
    } finally {
      setAreaLoading(false);
    }
  }, [selectedClassId, selectedStatus]);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchTasks();
    } else {
      fetchTasksByArea();
    }
  }, [viewMode, fetchTasks, fetchTasksByArea]);

  // Run Auto Absence Detector
  const handleRunDetector = async () => {
    setDetecting(true);
    setDetectMessage('');
    try {
      const res = await apiClient.post('/followup/detect', null, {
        params: {
          class_id: selectedClassId || undefined
        }
      });
      if (res.data) {
        setDetectMessage(res.data.message || 'تم فحص غياب الجلسات وتحديث المهام بنجاح');
        if (viewMode === 'list') fetchTasks();
        else fetchTasksByArea();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تشغيل كاشف الغائبين التلقائي');
    } finally {
      setDetecting(false);
    }
  };

  // Submit Log Entry
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!activeLogTask) return;
    setLogLoading(true);
    try {
      const res = await followupApi.logFollowup(activeLogTask.task_id, logFormData);
      if (res.success) {
        setActiveLogTask(null);
        setLogFormData({ contact_method: 'Phone', outcome: 'Promised', notes: '' });
        if (viewMode === 'list') fetchTasks();
        else fetchTasksByArea();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'فشل توثيق الافتقاد');
    } finally {
      setLogLoading(false);
    }
  };

  // Open History Logs
  const handleOpenHistory = async (task) => {
    setHistoryTask(task);
    try {
      const res = await followupApi.getTaskLogs(task.task_id);
      if (res.success) {
        setHistoryLogs(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر جلب سجل الافتقاد');
    }
  };

  // Escalate Task
  const handleEscalateTask = async (taskId) => {
    if (!window.confirm('هل تريد تصعيد هذه المهمة لأمين الخدمة؟')) return;
    try {
      const res = await followupApi.escalateTask(taskId);
      if (res.success) {
        if (viewMode === 'list') fetchTasks();
        else fetchTasksByArea();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'فشل التصعيد');
    }
  };

  // Print Area Visit Sheet
  const handlePrintAreaSheet = (areaGroup) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة الكشف');
      return;
    }

    const rowsHtml = areaGroup.tasks.map((t, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${t.member_name}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; color: #475569;">${t.member_stage || '—'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;" dir="ltr">${t.member_phone || '—'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${t.member_address || '—'}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px; color: #b91c1c; font-weight: bold;">
          غائب ${t.consecutive_weeks} أسابيع
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; width: 150px;"></td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>كشف زيارات الافتقاد الميداني - منطقة ${areaGroup.area}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          body { font-family: 'Cairo', sans-serif; padding: 25px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          .church { font-size: 17px; font-weight: 800; }
          .title { font-size: 20px; font-weight: 900; color: #b91c1c; margin: 4px 0; }
          .meta { font-size: 13px; color: #475569; display: flex; justify-content: space-around; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px; font-weight: 800; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church">كنيسة الشهيد العظيم مارجرجس والأنبا شنودة بالكرور</div>
          <div class="title">كشف زيارات وافتقاد الغائبين: منطقة (${areaGroup.area})</div>
          <div class="meta">
            <div><strong>عدد المخدومين المطلوب افتقادهم:</strong> ${areaGroup.count} طفل</div>
            <div><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">م</th>
              <th>اسم الطفل</th>
              <th style="width: 100px;">المرحلة / الفصل</th>
              <th style="width: 110px;">رقم الهاتف</th>
              <th>العنوان التفصيلي</th>
              <th style="width: 110px;">مدة الغياب</th>
              <th>تقرير ونتيجة الزيارة</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div>توقيع الخدام القائمين بالزيارة: .........................</div>
          <div>توقيع مسؤول الافتقاد: .........................</div>
          <div>توقيع كاهن الكنيسة: .........................</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 600);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <HeartHandshake size={28} style={{ color: '#f43f5e' }} />
            <span>نظام متابعة الغياب والافتقاد الكنسي</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            الكشف التلقائي عن غياب الجلسات، وتقسيم الافتقاد جغرافياً حسب المناطق السكنية وتوثيق نتائج الزيارات
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleRunDetector}
            className="btn btn-primary"
            disabled={detecting}
            style={{ gap: '0.5rem', background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', fontWeight: 700 }}
          >
            <Sparkles size={17} />
            <span>{detecting ? 'جاري فحص الجلسات...' : 'تشغيل كاشف الغائبين 🔍'}</span>
          </button>

          <button onClick={() => viewMode === 'list' ? fetchTasks() : fetchTasksByArea()} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {detectMessage && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '12px', color: '#7dd3fc', fontWeight: 700 }}>
          ℹ️ {detectMessage}
        </div>
      )}

      {/* 2. Top Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeartHandshake size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي حالات الغياب والافتقاد</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.totalTasks}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>المهام المعلقة (قيد المتابعة)</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{metrics.pendingCount}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>عاجل / متصاعد لأمين الخدمة</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444' }}>{metrics.urgentCount}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>تم الافتقاد بنجاح</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{metrics.completedCount}</strong>
          </div>
        </div>
      </div>

      {/* 3. View Mode Tabs & Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={() => setViewMode('list')}
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.86rem', padding: '0.45rem 1rem', gap: '6px' }}
          >
            <FileText size={16} />
            <span>قائمة المهام الفردية</span>
          </button>

          <button
            onClick={() => setViewMode('area')}
            className={`btn ${viewMode === 'area' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontSize: '0.86rem',
              padding: '0.45rem 1rem',
              gap: '6px',
              background: viewMode === 'area' ? 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)' : undefined,
              borderColor: viewMode === 'area' ? '#a855f7' : undefined
            }}
          >
            <MapPin size={16} />
            <span>تقسيم الافتقاد حسب المناطق السكنية 🗺️</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {viewMode === 'list' && (
          <div style={{ flex: '1 1 220px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingRight: '2.5rem' }}
              placeholder="بحث باسم الطفل، رقم التليفون، أو FLW-XXXX..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {/* Class Filter */}
        <div style={{ flex: '0 1 200px' }}>
          <select
            className="form-input"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">كل الفصول الخدمية</option>
            {classesList.map(c => (
              <option key={c.class_id} value={c.class_id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Priority Filter (in list mode) */}
        {viewMode === 'list' && (
          <div style={{ flex: '0 1 170px' }}>
            <select
              className="form-input"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="">كل الأولويات</option>
              <option value="Urgent">عاجل (4+ أسابيع) 🔴</option>
              <option value="High">عالي (3 أسابيع) 🟡</option>
              <option value="Normal">عادي (أسبوعين) 🔵</option>
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div style={{ flex: '0 1 170px' }}>
          <select
            className="form-input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="Pending">قيد الافتقاد (Pending)</option>
            <option value="Completed">تم الافتقاد (Completed)</option>
            <option value="Escalated">متصاعد (Escalated)</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#fca5a5' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginLeft: '6px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. VIEW A: List Table View */}
      {viewMode === 'list' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>رمز المهمة</th>
                  <th>اسم الطفل الغائب</th>
                  <th>المنطقة السكنية</th>
                  <th>المرحلة</th>
                  <th>عدد أسابيع الغياب</th>
                  <th>الأولوية</th>
                  <th>الاتصال بالوالدين</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: 'center' }}>إجراءات الافتقاد</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>جاري تحميل قائمة الافتقاد...</td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      لا توجد مهام افتقاد مطابقة للفلاتر الحالية. اضغط على "تشغيل كاشف الغائبين" للتحقق التلقائي.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => {
                    const isUrgent = t.priority === 'Urgent' || t.status === 'Escalated';
                    const isHigh = t.priority === 'High';
                    const cleanPhone = t.member_phone ? t.member_phone.replace(/\s+/g, '') : '';

                    return (
                      <tr key={t.task_id} style={{ opacity: t.status === 'Completed' ? 0.75 : 1 }}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                            {t.task_id}
                          </span>
                        </td>

                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          <div>{t.member_name}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>({t.member_id})</span>
                        </td>

                        <td>
                          {t.member_area ? (
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              background: 'rgba(168, 85, 247, 0.12)',
                              color: '#c084fc',
                              borderRadius: '4px',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              fontWeight: 700
                            }}>
                              {t.member_area}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        <td style={{ fontSize: '0.82rem' }}>{t.member_stage}</td>

                        <td>
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', fontWeight: 800 }}>
                            غائب {t.consecutive_weeks} أسابيع ⚠️
                          </span>
                        </td>

                        <td>
                          <span
                            className="badge"
                            style={{
                              background: isUrgent ? 'rgba(239, 68, 68, 0.2)' : isHigh ? 'rgba(251, 191, 36, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                              color: isUrgent ? '#ef4444' : isHigh ? '#fbbf24' : '#38bdf8'
                            }}
                          >
                            {isUrgent ? 'عاجل 🔴' : isHigh ? 'عالي 🟡' : 'عادي 🔵'}
                          </span>
                        </td>

                        {/* Direct Call & WhatsApp buttons */}
                        <td>
                          {cleanPhone ? (
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#34d399' }}
                                title="اتصال هاتفي مباشر"
                              >
                                <Phone size={13} />
                              </a>
                              <WhatsAppButton
                                phone={cleanPhone}
                                memberName={t.member_name}
                                memberId={t.member_id}
                                template="absence"
                                variant="icon"
                              />
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>لا يوجد هاتف</span>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${t.status === 'Completed' ? 'badge-success' : t.status === 'Escalated' ? 'badge-danger' : 'badge-warning'}`}>
                            {t.status === 'Completed' ? 'تم الافتقاد ✓' : t.status === 'Escalated' ? 'متصاعد لأمين الخدمة' : 'قيد المتابعة'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => { setActiveLogTask(t); setLogFormData({ contact_method: 'Phone', outcome: 'Promised', notes: '' }); }}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                              title="تسجيل نتيجة الافتقاد"
                            >
                              <span>توثيق 📝</span>
                            </button>

                            <button
                              onClick={() => handleOpenHistory(t)}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                              title="سجل الافتقادات السابقة"
                            >
                              <span>السجل 📋</span>
                            </button>

                            {t.status !== 'Escalated' && t.status !== 'Completed' && (
                              <button
                                onClick={() => handleEscalateTask(t.task_id)}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', color: '#f87171' }}
                                title="تصعيد لأمين الخدمة"
                              >
                                <span>تصعيد ⚡</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. VIEW B: Area Grouped View (تقسيم الافتقاد حسب المناطق السكنية) */}
      {viewMode === 'area' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {areaLoading ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              جاري تجميع مهام الافتقاد حسب المناطق السكنية...
            </div>
          ) : tasksByArea.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              لا توجد حالات افتقاد نشطة مجمعة حسب المناطق.
            </div>
          ) : (
            tasksByArea.map((grp) => (
              <div key={grp.area} className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                {/* Area Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                      <MapPin size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        منطقة: {grp.area}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {grp.count} مخدومين مستهدفين بالافتقاد والزيارات
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePrintAreaSheet(grp)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', gap: '6px', color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                  >
                    <Printer size={15} />
                    <span>طباعة كشف زيارات {grp.area} (PDF)</span>
                  </button>
                </div>

                {/* Area Children Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {grp.tasks.map((t) => (
                    <div
                      key={t.task_id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '10px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <strong style={{ fontSize: '0.98rem', color: '#ffffff' }}>{t.member_name}</strong>
                          <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                            غائب {t.consecutive_weeks} أسابيع
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          المرحلة / الفصل: <span style={{ color: 'var(--text-main)' }}>{t.member_stage || '—'}</span>
                        </div>

                        {t.member_address && (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Home size={13} style={{ flexShrink: 0 }} />
                            <span>{t.member_address}</span>
                          </div>
                        )}
                      </div>

                      {/* Contact & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {t.member_phone && (
                            <a
                              href={`tel:${t.member_phone}`}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#34d399' }}
                              title="اتصال هاتف"
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          {t.member_phone && (
                            <WhatsAppButton
                              phone={t.member_phone}
                              memberName={t.member_name}
                              memberId={t.member_id}
                              template="absence"
                              variant="icon"
                            />
                          )}
                        </div>

                        <button
                          onClick={() => { setActiveLogTask(t); setLogFormData({ contact_method: 'Visit', outcome: 'Promised', notes: '' }); }}
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                        >
                          توثيق الزيارة 📝
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. Log Follow-Up Drawer/Modal */}
      {activeLogTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: '#1e293b', boxShadow: 'var(--shadow-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HeartHandshake size={22} style={{ color: '#f43f5e' }} />
                <span>توثيق افتقاد: {activeLogTask.member_name}</span>
              </h3>
              <button onClick={() => setActiveLogTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label className="form-label">وسيلة التواصل مع المخدوم/الأسرة *</label>
                <select
                  className="form-input"
                  value={logFormData.contact_method}
                  onChange={(e) => setLogFormData({ ...logFormData, contact_method: e.target.value })}
                >
                  <option value="Phone">مكالمة هاتفية 📞</option>
                  <option value="Visit">زيارة منزلية 🏠</option>
                  <option value="WhatsApp">رسالة واتساب 💬</option>
                  <option value="Church">مقابلة بالكنيسة ⛪</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">نتيجة وموقف الافتقاد *</label>
                <select
                  className="form-input"
                  value={logFormData.outcome}
                  onChange={(e) => setLogFormData({ ...logFormData, outcome: e.target.value })}
                >
                  <option value="Promised">وعد بالحضور الأحد القادم 🟢 (إكمال المهمة)</option>
                  <option value="Sick">مريض 🏥 (استمرار المتابعة الأسبوع القادم)</option>
                  <option value="Traveling">مسافر ✈️ (استمرار المتابعة لحين عودته)</option>
                  <option value="Family_Reason">ظرف عائلي/اجتماعي 👨‍👩‍👧 (استمرار المتابعة)</option>
                  <option value="No_Response">عدم الرد 🔴 (إعادة المحاولة لاحقاً)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات الافتقاد والتفاصيل (اختياري)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={logFormData.notes}
                  onChange={(e) => setLogFormData({ ...logFormData, notes: e.target.value })}
                  placeholder="مثال: تحدثت مع والدة الطفل وأكدت شفائه وستحضره الأحد القادم..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setActiveLogTask(null)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={logLoading}>
                  {logLoading ? 'جاري الحفظ...' : 'حفظ وتوثيق الافتقاد 📝'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. History Logs Modal */}
      {historyTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', background: '#1e293b', boxShadow: 'var(--shadow-glow)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                سجل تاريخ افتقاد الطفل: {historyTask.member_name}
              </h3>
              <button onClick={() => setHistoryTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  لا توجد سجلات افتقاد سابقة لهذا الطفل بعد.
                </div>
              ) : (
                historyLogs.map((l) => (
                  <div key={l.log_id} style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 800, color: '#38bdf8' }}>
                        {l.contact_method === 'Phone' ? 'مكالمة هاتفية 📞' : l.contact_method === 'Visit' ? 'زيارة منزلية 🏠' : l.contact_method === 'WhatsApp' ? 'رسالة واتساب 💬' : 'مقابلة ⛪'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(l.logged_at).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: l.outcome === 'Promised' ? '#34d399' : '#fbbf24' }}>
                      النتيجة: {l.outcome === 'Promised' ? 'وعد بالحضور 🟢' : l.outcome === 'Sick' ? 'مريض 🏥' : l.outcome === 'Traveling' ? 'مسافر ✈️' : l.outcome === 'Family_Reason' ? 'ظرف عائلي 👨‍👩‍👧' : 'عدم الرد 🔴'}
                    </div>

                    {l.notes && (
                      <div style={{ fontSize: '0.82rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px' }}>
                        "{l.notes}"
                      </div>
                    )}

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                      الخادم: {l.servant_name || 'الخادم المسجل'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
