import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Sun,
  Plus,
  Users,
  Calendar,
  Award,
  CheckCircle,
  AlertCircle,
  FolderKanban
} from 'lucide-react';

export const SummerActivityManagement = () => {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [summerGroups, setSummerGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Summer Group Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    season_id: '',
    stage: 'ابتدائي',
    description: ''
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    fetchSummerGroups();
  }, [selectedSeason]);

  const fetchSeasons = async () => {
    try {
      const res = await api.get('/seasons');
      const items = res.data.data.items || [];
      setSeasons(items);
      if (items.length > 0) {
        setSelectedSeason(items[0].season_id);
      }
    } catch (err) {
      console.error('Failed to fetch seasons', err);
    }
  };

  const fetchSummerGroups = async () => {

    try {
      setLoading(true);
      const params = { group_type: 'Summer' };
      if (selectedSeason) params.season_id = selectedSeason;

      const res = await api.get('/classes', { params });
      setSummerGroups(res.data.data.items || []);
    } catch (err) {
      setError('تعذر جلب أنشطة ومجموعات النشاط الصيفي');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSummerGroup = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await api.post('/classes', {
        ...newGroup,
        group_type: 'Summer',
        season_id: selectedSeason || newGroup.season_id
      });
      setSuccess('تم إنشاء مجموعة النشاط الصيفي بنجاح ☀️');
      setShowCreateModal(false);
      setNewGroup({ name: '', season_id: '', stage: 'ابتدائي', description: '' });
      fetchSummerGroups();
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذر إنشاء مجموعة النشاط الصيفي');
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold-light)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sun size={30} style={{ color: '#f39c12' }} />
            قطاع النشاط الصيفي والمشاركات
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            إدارة مجموعات النشاط الصيفي والورش والمهرجانات والمسابقات حسب الموسم الخدمي
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
          <Plus size={18} />
          إضافة نشاط / مجموعة صيفية
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Seasons Selector Tabs */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-gold-light)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} />
          المواسم الخدمية والأنشطة الصيفية:
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectedSeason === '' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedSeason('')}
            style={{ fontSize: '0.85rem' }}
          >
            جميع المواسم
          </button>
          {seasons.map(s => (
            <button
              key={s.season_id}
              className={`btn ${selectedSeason === s.season_id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedSeason(s.season_id)}
              style={{ fontSize: '0.85rem' }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summer Activity Groups Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>جاري تحميل مجموعات النشاط الصيفي...</div>
      ) : summerGroups.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Sun size={48} style={{ opacity: 0.3, marginBottom: '1rem', color: '#f39c12' }} />
          <h3>لا توجد مجموعات صيفية مسجلة لهذا الموسم</h3>
          <p style={{ color: 'var(--text-muted)' }}>يمكنك إضافة ورش عمل أو مجموعات للمهرجان الصيفي بالضغط على "إضافة نشاط صيفي".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {summerGroups.map(grp => (
            <div
              key={grp.class_id}
              className="glass-card"
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(243, 156, 18, 0.25)',
                background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.8) 0%, rgba(35, 25, 15, 0.6) 100%)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', fontWeight: 700 }}>
                    ☀️ نشاط صيفي
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.4rem', color: '#ffffff' }}>{grp.name}</h3>
                </div>
                <span className="badge" style={{ fontSize: '0.75rem' }}>{grp.class_id}</span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {grp.description || 'لا يوجد وصف مضاف لهذا النشاط'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={16} style={{ color: '#f39c12' }} />
                  <span>المشاركون: <strong>{grp.active_members_count} طفل</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Award size={16} style={{ color: 'var(--color-gold)' }} />
                  <span>المرحلة: <strong>{grp.stage}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '500px', width: '90%', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-gold-light)', marginBottom: '1rem' }}>
              إضافة ورشة / مجموعة نشاط صيفي جديدة ☀️
            </h3>
            <form onSubmit={handleCreateSummerGroup}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">اسم النشاط / المجموعة الصيفية:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ورشة الكورال - صيف 2026"
                  className="form-control"
                  value={newGroup.name}
                  onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">المرحلة الدراسية المستهدفة:</label>
                <select
                  className="form-control"
                  value={newGroup.stage}
                  onChange={e => setNewGroup({ ...newGroup, stage: e.target.value })}
                >
                  <option value="حضانة">حضانة</option>
                  <option value="ابتدائي">ابتدائي</option>
                  <option value="إعدادي">إعدادي</option>
                  <option value="ثانوي">ثانوي</option>
                  <option value="جامعيين وخريجين">جامعيين وخريجين</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">وصف تفصيلي للنشاط:</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="تفاصيل النشاط والمواعيد والأهداف..."
                  value={newGroup.description}
                  onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ النشاط الصيفي</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
