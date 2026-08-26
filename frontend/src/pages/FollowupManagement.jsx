import React, { useEffect, useState, useCallback } from 'react';
import { followupApi } from '../api/followup';
import { getWaUrl } from '../utils/phone';
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
  Send
} from 'lucide-react';

const STAGE_OPTIONS = [
  'ALL',
  'حضانة (KG1 & KG2)',
  'ابتدائي - الصف الأول',
  'ابتدائي - الصف الثاني',
  'ابتدائي - الصف الثالث',
  'ابتدائي - الصف الرابع',
  'ابتدائي - الصف الخامس',
  'ابتدائي - الصف السادس',
  'إعدادي - الصف الأول',
  'إعدادي - الصف الثاني',
  'إعدادي - الصف الثالث',
  'ثانوي',
  'جامعة وخريجين'
];

export const FollowupManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedStage, setSelectedStage] = useState('');

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

  // Fetch Followup Tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await followupApi.getTasks({
        search: searchTerm,
        priority: selectedPriority,
        status: selectedStatus,
        limit: 50
      });
      if (res.success) {
        setTasks(res.data.items);

        // Calc summary metrics
        let pending = 0;
        let urgent = 0;
        let completed = 0;
        res.data.items.forEach(t => {
          if (t.status === 'Pending') pending++;
          if (t.status === 'Completed') completed++;
          if (t.priority === 'Urgent' || t.status === 'Escalated') urgent++;
        });

        setMetrics({
          totalTasks: res.data.total,
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
  }, [searchTerm, selectedPriority, selectedStatus]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Run Auto Absence Detector
  const handleRunDetector = async () => {
    setDetecting(true);
    setDetectMessage('');
    try {
      const res = await followupApi.runDetector(selectedStage || null);
      if (res.success) {
        setDetectMessage(res.message);
        fetchTasks();
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
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر توثيق نتيجة الافتقاد');
    } finally {
      setLogLoading(false);
    }
  };

  // Open History Logs Modal
  const handleOpenHistory = async (task) => {
    setHistoryTask(task);
    try {
      const res = await followupApi.getTaskLogs(task.task_id);
      if (res.success) {
        setHistoryLogs(res.data);
      }
    } catch (err) {
      setHistoryLogs([]);
    }
  };

  // Escalate Task
  const handleEscalateTask = async (taskId) => {
    try {
      await followupApi.escalateTask(taskId);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تصعيد المهمة');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Page Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeartHandshake size={28} style={{ color: '#f43f5e' }} />
            <span>نظام متابعة الغياب والافتقاد الكنسي</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            الكشف التلقائي عن غياب الجلسات، وتكليف الخدام وتوثيق نتائج الزيارات والمكالمات لمنع تسرب الأطفال
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleRunDetector}
            className="btn btn-primary"
            disabled={detecting}
            style={{ gap: '0.5rem', background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }}
          >
            <Sparkles size={18} />
            <span>{detecting ? 'جاري فحص الجلسات...' : 'تشغيل كاشف الغائبين وتحديث المهام 🔍'}</span>
          </button>

          <button onClick={fetchTasks} className="btn btn-secondary">
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

      {/* 3. Filters Bar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
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

        <div style={{ flex: '0 1 180px' }}>
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

        <div style={{ flex: '0 1 180px' }}>
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

        <div style={{ flex: '0 1 180px' }}>
          <select
            className="form-input"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            {STAGE_OPTIONS.map((stg) => (
              <option key={stg} value={stg === 'ALL' ? '' : stg}>{stg}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#fca5a5' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginLeft: '6px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Follow-Up Tasks Grid / Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>رمز المهمة</th>
                <th>اسم الطفل الغائب</th>
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>جاري تحميل قائمة الافتقاد...</td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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

                      <td style={{ fontSize: '0.82rem' }}>{t.member_stage}</td>

                      <td>
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', fontWeight: 800 }}>
                          غائب {t.consecutive_weeks} أسابيع متتالية ⚠️
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
                              <span>{cleanPhone}</span>
                            </a>
                             <a
                               href={getWaUrl(cleanPhone)}
                               target="_blank"
                               rel="noreferrer"
                               className="btn btn-secondary"
                               style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#25D366' }}
                               title="مراسلة واتساب"
                             >
                              <MessageSquare size={13} />
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>لا يوجد هاتف</span>
                        )}
                      </td>

                      <td>
                        <span
                          className="badge"
                          style={{
                            background: t.status === 'Completed' ? 'rgba(52, 211, 153, 0.15)' : t.status === 'Escalated' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                            color: t.status === 'Completed' ? '#34d399' : t.status === 'Escalated' ? '#f87171' : '#fbbf24'
                          }}
                        >
                          {t.status === 'Completed' ? 'تم الافتقاد 🟢' : t.status === 'Escalated' ? 'متصاعد 🔴' : 'قيد الافتقاد 🟡'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setActiveLogTask(t)}
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', gap: '3px' }}
                          >
                            <FileText size={14} />
                            <span>توثيق افتقاد 📝</span>
                          </button>

                          <button
                            onClick={() => handleOpenHistory(t)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                            title="عرض سجل تاريخ افتقاد الطفل"
                          >
                            <span>سجل التاريخ 📜</span>
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
