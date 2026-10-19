import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingsApi } from '../api/settings';
import { classesApi } from '../api/classes';
import { apiClient } from '../api/client';
import { AuditLogModal } from '../components/AuditLogModal';
import {
  Settings,
  Save,
  RefreshCw,
  Award,
  Percent,
  Clock,
  Church,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Sliders,
  DollarSign,
  QrCode,
  Calendar,
  Layers,
  Plus,
  ArrowRight,
  Flame,
  X
} from 'lucide-react';


export const SettingsPage = () => {
  const { user, hasPermission } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'SuperAdmin';

  const [settings, setSettings] = useState({
    attendance_points: '10',
    event_points: '20',
    reward_scan_add_points: '5',
    reward_scan_deduct_points: '5',
    points_redemption_rate: '0.25',
    absence_threshold_weeks: '2',
    discount_high_pct: '30.0',
    discount_medium_pct: '15.0',
    church_name: 'كنيسة الشهيد العظيم مارجرجس الروماني والقديس العظيم الأنبا شنودة رئيس المتوحدين'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupActionLoading, setBackupActionLoading] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Seasons Management State
  const [seasons, setSeasons] = useState([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [newSeason, setNewSeason] = useState({
    name: 'الموسم الخدمي 2027/2028',
    start_date: '2027-09-01',
    end_date: '2028-08-31',
    is_active: false
  });

  // Coptic New Year Promotion State
  const [showCopticModal, setShowCopticModal] = useState(false);
  const [copticConfirmText, setCopticConfirmText] = useState('');
  const [copticCheck1, setCopticCheck1] = useState(false);
  const [copticCheck2, setCopticCheck2] = useState(false);
  const [copticCheck3, setCopticCheck3] = useState(false);
  const [promotingCoptic, setPromotingCoptic] = useState(false);
  const [copticResult, setCopticResult] = useState(null);

  // Download Backup
  const handleDownloadBackup = async () => {
    try {
      setBackupActionLoading(true);
      const response = await apiClient.get('/backup/download', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `almasalla_backup_${today}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage({ type: 'success', text: 'تم تنزيل ملف النسخة الاحتياطية بنجاح 💾' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'تعذر تنزيل النسخة الاحتياطية' });
    } finally {
      setBackupActionLoading(false);
    }
  };

  // Restore Backup
  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("⚠️ تحذير أمني واستعادة ذرية:\nهل أنت على يقين من استعادة النسخة الاحتياطية؟\nسيتم تحديث وإعادة بناء بيانات النظام بالكامل داخل Database Transaction أمنية.")) {
      e.target.value = '';
      return;
    }

    try {
      setBackupActionLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.success) {
        setMessage({ type: 'success', text: 'تمت استعادة كافة بيانات النظام والملفات بنجاح 🔄' });
        fetchSettings();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'فشلت عملية الاستعادة وتم إلغاء التغييرات تلقائياً' });
    } finally {
      setBackupActionLoading(false);
      e.target.value = '';
    }
  };

  // Fetch settings from API
  const fetchSettings = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await settingsApi.getSettings();
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'تعذر جلب إعدادات النظام' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Seasons
  const fetchSeasons = async () => {
    setLoadingSeasons(true);
    try {
      const res = await settingsApi.getSeasons();
      if (res.success && res.data) {
        setSeasons(res.data);
      }
    } catch (err) {
      // transient
    } finally {
      setLoadingSeasons(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchSeasons();
  }, []);

  // Save Settings Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await settingsApi.updateSettings({ settings });
      if (res.success) {
        setMessage({ type: 'success', text: 'تم حفظ وتحديث كافة إعدادات والثوابت الديناميكية للنظام بنجاح ⚙️' });
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'فشل حفظ التعديلات' });
    } finally {
      setSaving(false);
    }
  };

  // Create Season Submit
  const handleCreateSeason = async (e) => {
    e.preventDefault();
    try {
      const res = await settingsApi.createSeason(newSeason);
      if (res.success) {
        setShowSeasonModal(false);
        fetchSeasons();
        setMessage({ type: 'success', text: 'تم إضافة الموسم الدراسي بنجاح 🎉' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة الموسم');
    }
  };

  // Activate Season
  const handleActivateSeason = async (seasonId) => {
    try {
      const res = await settingsApi.updateSeason(seasonId, { is_active: true });
      if (res.success) {
        fetchSeasons();
        setMessage({ type: 'success', text: 'تم تنشيط وتفعيل الموسم بنجاح 🌟' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تنشيط الموسم');
    }
  };

  // Promote New Coptic Year
  const handlePromoteCopticYear = async () => {
    if (copticConfirmText.trim() !== 'عام قبطي جديد' || !copticCheck1 || !copticCheck2 || !copticCheck3) {
      return;
    }
    setPromotingCoptic(true);
    try {
      const res = await classesApi.promoteNewCopticYear();
      if (res.success) {
        setCopticResult(res.data);
        setMessage({
          type: 'success',
          text: `تم تفعيل العام القبطي الجديد بنجاح! تم ترقية ${res.data.promoted_count} مخدوم، ونقل ${res.data.graduated_to_university_count} مخدوم إلى جامعيين وخريجين، وتصفير السجلات!`
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إتمام عملية العام القبطي الجديد');
    } finally {
      setPromotingCoptic(false);
    }
  };


  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={28} style={{ color: '#38bdf8' }} />
            <span>إعدادات وتخصيص النظام الديناميكي (Control Panel)</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            لوحة تحكم كاملة للمسؤول (Super Admin) لتعديل كافة الثوابت والقواعد المالية وقواعد الحضور والافتفاد بدون أكواد ثابتة
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchSettings} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {message.text && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            fontWeight: 700,
            background: message.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? '#34d399' : '#f87171'}`,
            color: message.type === 'success' ? '#34d399' : '#fca5a5'
          }}
        >
          {message.type === 'success' ? <CheckCircle size={18} style={{ display: 'inline', marginLeft: '6px' }} /> : <AlertCircle size={18} style={{ display: 'inline', marginLeft: '6px' }} />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" />
          <div style={{ marginTop: '0.5rem' }}>جاري تحميل إعدادات النظام الديناميكية...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Points & Rewards Config */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <Award size={22} style={{ color: '#fbbf24' }} />
              <span>إعدادات النقاط والمكافآت (Points & Rewards Config)</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              
              <div className="form-group">
                <label className="form-label">نقاط حضور اجتماع مدارس الأحد (M5)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={settings.attendance_points || '10'}
                  onChange={(e) => setSettings({ ...settings, attendance_points: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>عدد النقاط الممنوحة تلقائياً للطفل عند مسح الحضور الأسبوعي</span>
              </div>

              <div className="form-group">
                <label className="form-label">نقاط المشاركة بالرحلات والأنشطة (M4)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={settings.event_points || '20'}
                  onChange={(e) => setSettings({ ...settings, event_points: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>عدد النقاط التشجيعية الممنوحة عند التواجد بالرحلات</span>
              </div>

              <div className="form-group">
                <label className="form-label">سعر استبدال النقطة بالجنيه (EGP per Point)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  className="form-input"
                  value={settings.points_redemption_rate || '0.25'}
                  onChange={(e) => setSettings({ ...settings, points_redemption_rate: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>مثال: 0.25 تعني أن كل 100 نقطة تساوي خصم 25 جنيه</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}>
                  <QrCode size={16} />
                  <span>نقاط إضافة المكافأة بالمسح السريع QR</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={settings.reward_scan_add_points || '5'}
                  onChange={(e) => setSettings({ ...settings, reward_scan_add_points: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>عدد النقاط الممنوحة عند الضغط على "إضافة نقاط" في الماسح (ثابتة 5 نقاط افتراضياً)</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171' }}>
                  <QrCode size={16} />
                  <span>نقاط خصم الجزاء بالمسح السريع QR</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={settings.reward_scan_deduct_points || '5'}
                  onChange={(e) => setSettings({ ...settings, reward_scan_deduct_points: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>عدد النقاط المخصومة عند الضغط على "خصم نقاط" في الماسح (ثابتة 5 نقاط افتراضياً)</span>
              </div>
            </div>
          </div>


          {/* Section 2: Trip Attendance Discounts */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <Percent size={22} style={{ color: '#34d399' }} />
              <span>قواعد الخصم المالي التلقائي للرحلات (Trip Discount Rates)</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              
              <div className="form-group">
                <label className="form-label">نسبة الخصم لحضور 90% فأكثر (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="form-input"
                  value={settings.discount_high_pct || '30.0'}
                  onChange={(e) => setSettings({ ...settings, discount_high_pct: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>نسبة الخصم المالي للأطفال الأكثر انتظاماً</span>
              </div>

              <div className="form-group">
                <label className="form-label">نسبة الخصم لحضور 75% إلى 89% (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="form-input"
                  value={settings.discount_medium_pct || '15.0'}
                  onChange={(e) => setSettings({ ...settings, discount_medium_pct: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>نسبة الخصم المالي للانتظام المتوسط</span>
              </div>
            </div>
          </div>

          {/* Section 3: Absence & Followup Rules */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <Clock size={22} style={{ color: '#f43f5e' }} />
              <span>إعدادات كاشف الغياب والافتفاد (Absence & Followup Config)</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">عتبة بدء الافتقاد (عدد جلسات الغياب المتتالية)</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={settings.absence_threshold_weeks || '2'}
                  onChange={(e) => setSettings({ ...settings, absence_threshold_weeks: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>مثال: 2 تعني إنشاء/تحديث مهمة افتقاد تلقائياً عند غياب جلسين متتاليتين</span>
              </div>
            </div>
          </div>

          {/* Section 4: Church Branding */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <Church size={22} style={{ color: '#38bdf8' }} />
              <span>هوية الكنيسة والطباعة (Church Branding)</span>
            </h3>

            <div className="form-group">
              <label className="form-label">اسم الكنيسة الرسمي المطبوع بالبطاقات والتقارير</label>
              <input
                type="text"
                className="form-input"
                value={settings.church_name || 'كنيسة الشهيد العظيم مارجرجس الروماني والقديس العظيم الأنبا شنودة رئيس المتوحدين'}
                onChange={(e) => setSettings({ ...settings, church_name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Section 5: Atomic Backup & Restore */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <ShieldCheck size={22} style={{ color: '#38bdf8' }} />
              <span>النسخ الاحتياطي والاستعادة الذرية (Database Backup & Restore)</span>
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              تصدير واستعادة كافة بيانات قاعدة البيانات بملف JSON مؤرخ ومحمي. عملية الاستعادة تتم داخل Transaction ذرية واحدة تضمن الـ Rollback الكامل في حالة حدوث أي طارئ.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {hasPermission('settings:write') && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadBackup}
                  disabled={backupActionLoading}
                  style={{ padding: '0.65rem 1.25rem', gap: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' }}
                >
                  <span>💾 تنزيل نسخة احتياطية كاملة (JSON)</span>
                </button>
              )}

              {hasPermission('settings:write') && (
                <label
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🔄 استعادة نسخة احتياطية من ملف</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    disabled={backupActionLoading}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              {hasPermission('audit:read') && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAuditModal(true)}
                  style={{ padding: '0.65rem 1.25rem', gap: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}
                >
                  <span>🛡️ عرض سجل النشاطات والتدقيق (Audit Logs)</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 6: Seasons Management */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Calendar size={22} style={{ color: '#38bdf8' }} />
                <span>إدارة المواسم الخدمية والكنسية (Seasons Management)</span>
              </h3>
              {isSuperAdmin && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSeasonModal(true)}
                  style={{ gap: '0.4rem', fontSize: '0.85rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                >
                  <Plus size={16} />
                  <span>إضافة موسم دراسي جديد</span>
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              الموسم الدراسي والخدمي الحالي المعتمد بالنظام هو <strong>2026/2027</strong>. يمكنك إضافة مواسم جديدة وتفعيل الموسم المطلوب.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {seasons.map((s) => (
                <div
                  key={s.season_id}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: s.is_active ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: s.is_active ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>{s.name}</strong>
                    {s.is_active ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', background: 'rgba(52, 211, 153, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                        الموسم النشط حالياً ✅
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>موسم سابق/أرشيف</span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    الفترة: {s.start_date || 'غير محدد'} إلى {s.end_date || 'غير محدد'}
                  </div>

                  {!s.is_active && isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => handleActivateSeason(s.season_id)}
                      className="btn btn-secondary"
                      style={{ marginTop: '0.5rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', alignSelf: 'flex-start' }}
                    >
                      تفعيل هذا الموسم
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Coptic New Year Engine (Super Admin Only) */}
          {isSuperAdmin && (
            <div
              className="glass-card"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                border: '2px solid #f59e0b',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%)',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.15)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                  <Flame size={26} style={{ color: '#f59e0b' }} />
                  <span>🌟 محرك العام القبطي الجديد وترقية المخدومين (Coptic New Year Promotion)</span>
                </h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, background: '#f59e0b', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                  خاص بالسوبر أدمن فقط 👑
                </span>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#fde68a', lineHeight: 1.6, margin: 0 }}>
                هذا الإجراء مصمم لتشغيله مرة واحدة في بداية السنة الكنسية الجديدة: يقوم تلقائياً بترحيل مخدومي كافة الفصول الدراسية للسنة التالية (أولى ابتدائي إلى تانية، تانية إلى تالتة... وتالتة ثانوي إلى جامعيين وخريجين)، مع إبقاء حضانة وجامعيين وخريجين دون نقل، وتصفير سجلات الحضور والنقاط والافتقاد للبدء بعام خدمي جديد ومبارك.
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCopticModal(true);
                    setCopticConfirmText('');
                    setCopticCheck1(false);
                    setCopticCheck2(false);
                    setCopticCheck3(false);
                    setCopticResult(null);
                  }}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    border: '1px solid #fbbf24',
                    padding: '0.75rem 1.5rem',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    gap: '0.5rem'
                  }}
                >
                  <Sparkles size={18} />
                  <span>بدء إجراءات ترقية العام القبطي الجديد 🌟</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {hasPermission('settings:write') && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ padding: '0.75rem 2rem', fontSize: '1rem', gap: '0.5rem', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' }}
              >
                <Save size={20} />
                <span>{saving ? 'جاري حفظ التغييرات...' : 'حفظ وإرسال التغييرات للنظام ⚙️'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* Coptic New Year Warning & Execution Modal */}
      {showCopticModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '640px', width: '100%', padding: '2rem', border: '2px solid #ef4444', background: '#0f172a', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f87171' }}>
                <AlertTriangle size={28} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>تحذير استثنائي: تطبيق العام القبطي الجديد</h3>
              </div>
              <button onClick={() => setShowCopticModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {copticResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={56} style={{ color: '#34d399', margin: '0 auto' }} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#34d399' }}>تم تفعيل العام القبطي الجديد بنجاح! 🎉</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'right' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>المخدومين الذين تم ترقيتهم</span>
                    <strong style={{ fontSize: '1.3rem', color: '#38bdf8' }}>{copticResult.promoted_count}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>المنقولين لجامعيين وخريجين</span>
                    <strong style={{ fontSize: '1.3rem', color: '#fbbf24' }}>{copticResult.graduated_to_university_count}</strong>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                  تم تصفير جلسات الحضور والغياب، مهام الافتقاد، نقاط المخدومين، وسجل التدقيق لبدء العام الجديد بنظافة كاملة.
                </p>
                <button onClick={() => setShowCopticModal(false)} className="btn btn-primary" style={{ alignSelf: 'center', marginTop: '0.5rem' }}>
                  إغلاق ومتابعة النظام
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>
                  أنت على وشك تنفيذ عملية ترحيل كبرى على مستوى قاعدة بيانات الكنيسة بالكامل. يرجى قراءة الآثار التالية بعناية شديدة:
                </p>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#fca5a5' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span>1️⃣</span>
                    <span><strong>تصعيد فوري للمراحل:</strong> مخدومو أولى ابتدائي سينتقلون لتانية، وتانية لتالتة... ومخدومو تالتة ثانوي سينتقلون إلى مرحلة "جامعيين وخريجين".</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span>2️⃣</span>
                    <span><strong>الحفاظ على المراحل الثابتة:</strong> مخدومو مرحلة الحضانة ومرحلة جامعيين وخريجين يبقون في أماكنهم دون أي ترحيل.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span>3️⃣</span>
                    <span><strong>تصفير شامل للعام الجديد:</strong> سيتم تصفير جلسات وسجلات الحضور والغياب، مهام الافتقاد، نقاط المخدومين وسجل العمليات، وسجل التدقيق.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span>⚠️</span>
                    <span><strong>لا يمكن التراجع:</strong> هذا الإجراء نهائي ولا يمكن التراجع عنه بأي حال من الأحوال إلا باستعادة نسخة احتياطية سابقة.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#f8fafc' }}>
                    <input type="checkbox" checked={copticCheck1} onChange={(e) => setCopticCheck1(e.target.checked)} />
                    <span>أوافق وأعلم أنه سيتم نقل المخدومين تلقائياً إلى صفوفهم التالية</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#f8fafc' }}>
                    <input type="checkbox" checked={copticCheck2} onChange={(e) => setCopticCheck2(e.target.checked)} />
                    <span>أوافق على تصفير الحضور والغياب والافتقاد ونقاط المكافآت بالكامل</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#f8fafc' }}>
                    <input type="checkbox" checked={copticCheck3} onChange={(e) => setCopticCheck3(e.target.checked)} />
                    <span>أؤكد أنني سوبر أدمن ولدي التفويض الكنسي الكامل لتنفيذ الترقية السنوية</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#fca5a5' }}>
                    لتأكيد التنفيذ، يرجى كتابة العبارة التالية بدقة: <strong style={{ color: '#fff' }}>عام قبطي جديد</strong>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="اكتب هنا: عام قبطي جديد"
                    value={copticConfirmText}
                    onChange={(e) => setCopticConfirmText(e.target.value)}
                    style={{ borderColor: copticConfirmText.trim() === 'عام قبطي جديد' ? '#34d399' : 'rgba(239, 68, 68, 0.5)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowCopticModal(false)} className="btn btn-secondary">
                    إلغاء وتراجع
                  </button>

                  <button
                    type="button"
                    onClick={handlePromoteCopticYear}
                    disabled={promotingCoptic || !copticCheck1 || !copticCheck2 || !copticCheck3 || copticConfirmText.trim() !== 'عام قبطي جديد'}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      border: '1px solid #ef4444',
                      opacity: (!copticCheck1 || !copticCheck2 || !copticCheck3 || copticConfirmText.trim() !== 'عام قبطي جديد') ? 0.5 : 1
                    }}
                  >
                    {promotingCoptic ? 'جاري تنفيذ الترقية والتصفير...' : 'تأكيد تفعيل العام القبطي الجديد 🔥'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Season Modal */}
      {showSeasonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', border: '1px solid rgba(56, 189, 248, 0.4)', background: '#0f172a' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                إضافة موسم خدمي جديد 📅
              </h3>
              <button onClick={() => setShowSeasonModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">اسم الموسم</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: الموسم الخدمي 2027/2028"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">تاريخ البداية</label>
                <input
                  type="date"
                  className="form-input"
                  value={newSeason.start_date}
                  onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">تاريخ النهاية</label>
                <input
                  type="date"
                  className="form-input"
                  value={newSeason.end_date}
                  onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
                  required
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#f8fafc' }}>
                <input
                  type="checkbox"
                  checked={newSeason.is_active}
                  onChange={(e) => setNewSeason({ ...newSeason, is_active: e.target.checked })}
                />
                <span>تفعيل هذا الموسم مباشرة كموسم نشط حالي</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowSeasonModal(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  حفظ الموسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      <AuditLogModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} />

    </div>
  );
};

