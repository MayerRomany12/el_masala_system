import React, { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings';
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
  Sparkles,
  Sliders,
  DollarSign
} from 'lucide-react';

export const SettingsPage = () => {
  const [settings, setSettings] = useState({
    attendance_points: '10',
    event_points: '20',
    points_redemption_rate: '0.25',
    absence_threshold_weeks: '2',
    discount_high_pct: '30.0',
    discount_medium_pct: '15.0',
    church_name: 'كنيسة السيدة العذراء مريم والأنبا بولا بالمسلة'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

  useEffect(() => {
    fetchSettings();
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
                value={settings.church_name || 'كنيسة السيدة العذراء مريم والأنبا بولا بالمسلة'}
                onChange={(e) => setSettings({ ...settings, church_name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
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
        </form>
      )}
    </div>
  );
};
