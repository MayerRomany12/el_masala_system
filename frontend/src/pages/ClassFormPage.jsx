import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ArrowRight, Plus, Save, AlertCircle, CheckCircle, Layers } from 'lucide-react';

export const ClassFormPage = () => {
  const navigate = useNavigate();

  const [seasons, setSeasons] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    group_type: 'Regular',
    stage: 'ابتدائي',
    season_id: '',
    description: ''
  });

  useEffect(() => {
    apiClient.get('/seasons/?status=Active')
      .then(res => {
        const list = res?.data?.data?.items || res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
        setSeasons(list);
      })
      .catch(err => {
        console.error('Error fetching seasons:', err);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setError('يرجى إدخال اسم الفصل أو المجموعة الخدمية');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        group_type: formData.group_type,
        stage: formData.stage,
        season_id: formData.season_id || null,
        description: formData.description.trim() || null
      };

      const res = await apiClient.post('/classes', payload);
      setSuccessMsg('تم إنشاء الفصل بنجاح');
      const createdId = res?.data?.data?.class_id || res?.data?.class_id;
      setTimeout(() => {
        if (createdId) {
          navigate(`/classes/${createdId}`);
        } else {
          navigate('/classes');
        }
      }, 700);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string'
        ? detail
        : (Array.isArray(detail)
            ? detail.map(d => (d.loc ? `${d.loc.slice(-1)}: ` : '') + (d.msg || d.message)).join(' | ')
            : err.response?.data?.message)
          || 'تعذر إنشاء الفصل. يرجى التأكد من البيانات والمحاولة مجدداً.';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={() => navigate('/classes')}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          <ArrowRight size={16} />
          <span>العودة للفصول</span>
        </button>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          إنشاء فصل أو مجموعة خدمة جديدة
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          إضافة فصل تربية كنسية أو مجموعة نشاط صيفي وتحديد المرحلة
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#fca5a5',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#86efac',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="glass-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingBottom: '0.65rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--color-gold)',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            <Layers size={18} />
            <span>بيانات الفصل والمرحلة</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">اسم الفصل / المجموعة*</label>
              <input
                type="text"
                className="form-input"
                placeholder="مثال: فصل أولى وثانية ابتدائي (بنين)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">نوع المجموعة*</label>
                <select
                  className="form-input"
                  value={formData.group_type}
                  onChange={(e) => setFormData({ ...formData, group_type: e.target.value })}
                >
                  <option value="Regular">فصل خدمي أساسي (مدارس الأحد)</option>
                  <option value="Summer">مجموعة نشاط صيفي</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المرحلة الدراسية*</label>
                <select
                  className="form-input"
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                >
                  <option value="حضانة">حضانة</option>
                  <option value="ابتدائي">ابتدائي</option>
                  <option value="إعدادي">إعدادي</option>
                  <option value="ثانوي">ثانوي</option>
                  <option value="جامعيين وخريجين">جامعيين وخريجين</option>
                  <option value="أنشطة عامة">أنشطة عامة (ألحان / كورال / كشافة)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">الموسم الخدمي (اختياري)</label>
              <select
                className="form-input"
                value={formData.season_id}
                onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
              >
                <option value="">بدون موسم محدد (مستمر على مدار العام)</option>
                {seasons.map(s => (
                  <option key={s.season_id} value={s.season_id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">وصف مختصر (اختياري)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="وصف للفصل الخدمي أو الأهداف أو الملاحظات..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="btn btn-secondary"
            disabled={submitting}
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={16} />
            <span>{submitting ? 'جاري الحفظ...' : 'إنشاء الفصل'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
