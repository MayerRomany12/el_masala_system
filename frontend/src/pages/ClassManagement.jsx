import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  FolderKanban,
  Plus,
  Users,
  Search,
  Filter,
  GraduationCap,
  RefreshCw,
  Sun,
  AlertCircle,
  CheckCircle,
  Layers,
  Trash2
} from 'lucide-react';

export const ClassManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ─── Data State ──────────────────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Filters & Search State ──────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'Regular' | 'Summer'
  const [filterStage, setFilterStage] = useState('');
  const [filterSeason, setFilterSeason] = useState('');

  // ─── Auto-dismiss Notification Helpers ────────────────────────────────────
  const notifySuccess = (msg) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 4500);
  };

  const notifyError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 5500);
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const fetchClasses = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await apiClient.get('/classes', { params: { limit: 200 } });
      setClasses(res.data?.data?.items || []);
    } catch (err) {
      notifyError(err.response?.data?.message || err.response?.data?.detail || 'تعذر جلب قائمة الفصول والمجموعات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchSeasons = useCallback(async () => {
    try {
      const res = await apiClient.get('/seasons', { params: { status: 'Active' } });
      setSeasons(res.data?.data?.items || []);
    } catch (err) {
      console.error('Error fetching seasons:', err);
    }
  }, []);

  const handleDeleteClass = async (cls) => {
    if (!window.confirm(`هل أنت متأكد من حذف فصل "${cls.name}" (${cls.class_id}) نهائياً؟`)) {
      return;
    }
    try {
      await apiClient.delete(`/classes/${cls.class_id}`);
      notifySuccess(`تم حذف فصل "${cls.name}" بنجاح`);
      fetchClasses(true);
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'فشل حذف الفصل');
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchSeasons();
  }, [fetchClasses, fetchSeasons]);

  // ─── Statistics Calculation ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = classes.length;
    const sundaySchool = classes.filter((c) => c.group_type === 'SundaySchool' || c.group_type === 'Regular' || c.group_type === 'Standard').length;
    const summer = classes.filter((c) => c.group_type === 'Summer').length;
    const general = classes.filter((c) => c.group_type === 'General').length;
    const totalMembers = classes.reduce((sum, c) => sum + (c.active_members_count || 0), 0);
    return { total, sundaySchool, summer, general, totalMembers };
  }, [classes]);

  // ─── Filtered Classes ─────────────────────────────────────────────────────
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchesSearch =
        !searchTerm.trim() ||
        cls.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.class_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === 'ALL' ||
        cls.group_type === filterType ||
        (filterType === 'SundaySchool' && (cls.group_type === 'Regular' || cls.group_type === 'Standard'));
      const matchesStage = !filterStage || cls.stage === filterStage;
      const matchesSeason = !filterSeason || cls.season_id === filterSeason;

      return matchesSearch && matchesType && matchesStage && matchesSeason;
    });
  }, [classes, searchTerm, filterType, filterStage, filterSeason]);

  const stageOptions = ['حضانة', 'ابتدائي', 'إعدادي', 'ثانوي', 'جامعيين وخريجين', 'أنشطة عامة'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* ─── Top Bar: Title & Primary Actions ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            إدارة الفصول والمجموعات
          </h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            توزيع المخدومين والخدام على فصول التربية الكنسية والأنشطة الصيفية
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchClasses(true)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="تحديث البيانات"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/classes/new')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>إنشاء فصل جديد</span>
          </button>
        </div>
      </div>

      {/* ─── Global Notifications ────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '0.85rem 1rem',
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

      {success && (
        <div style={{
          padding: '0.85rem 1rem',
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
          <span>{success}</span>
        </div>
      )}

      {/* ─── Stats KPI Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', flexShrink: 0 }}>
            <FolderKanban size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>إجمالي الفصول</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-light)', flexShrink: 0 }}>
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>فصول الخدمة الأساسية</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>{stats.regular}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
            <Sun size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>مجموعات النشاط الصيفي</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>{stats.summer}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-sm)', background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)', flexShrink: 0 }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>الأطفال الموزعون</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>{stats.totalMembers}</div>
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingRight: '2rem' }}
            placeholder="بحث باسم الفصل أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Group Type Filter */}
        <div style={{ flex: '0 1 180px' }}>
          <select
            className="form-input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">جميع أنواع الخدمة</option>
            <option value="SundaySchool">مدارس أحد ⛪</option>
            <option value="Summer">نشاط صيفي ☀️</option>
            <option value="General">عام 🌟</option>
          </select>
        </div>

        {/* Stage Filter */}
        <div style={{ flex: '0 1 160px' }}>
          <select
            className="form-input"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
          >
            <option value="">جميع المراحل</option>
            {stageOptions.map((stg) => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>
        </div>

        {/* Season Filter */}
        <div style={{ flex: '0 1 160px' }}>
          <select
            className="form-input"
            value={filterSeason}
            onChange={(e) => setFilterSeason(e.target.value)}
          >
            <option value="">جميع المواسم</option>
            {seasons.map((s) => (
              <option key={s.season_id} value={s.season_id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(searchTerm || filterType !== 'ALL' || filterStage || filterSeason) && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setFilterType('ALL');
              setFilterStage('');
              setFilterSeason('');
            }}
            style={{ fontSize: '0.82rem' }}
          >
            إعادة ضبط
          </button>
        )}
      </div>

      {/* ─── Classes Cards Grid ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          جاري تحميل الفصول والمجموعات...
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <FolderKanban size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <h3 style={{ color: 'var(--text-main)', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>
            لا توجد فصول مطابقة
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem', fontSize: '0.85rem' }}>
            لم يتم العثور على فصول تطابق معايير البحث أو التصفية المختارة.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/classes/new')}
            style={{ fontSize: '0.85rem' }}
          >
            <Plus size={15} />
            <span>إنشاء فصل جديد الآن</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filteredClasses.map((cls) => {
            const isSummer = cls.group_type === 'Summer';

            return (
              <div
                key={cls.class_id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem'
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span
                      className="badge"
                      style={{
                        background:
                          cls.group_type === 'Summer'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : cls.group_type === 'General'
                            ? 'rgba(168, 85, 247, 0.15)'
                            : 'rgba(56, 189, 248, 0.12)',
                        color:
                          cls.group_type === 'Summer'
                            ? '#fbbf24'
                            : cls.group_type === 'General'
                            ? '#c084fc'
                            : 'var(--color-primary-light)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      {cls.group_type === 'Summer'
                        ? '☀️ نشاط صيفي'
                        : cls.group_type === 'General'
                        ? '🌟 عام'
                        : '⛪ مدارس أحد'}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {cls.class_id}
                    </span>
                  </div>

                  {/* Title & Stage */}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--text-main)' }}>
                    {cls.name}
                  </h3>

                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      المرحلة: <strong style={{ color: 'var(--text-main)' }}>{cls.stage || 'عام'}</strong>
                    </div>
                    {cls.season_name && (
                      <div>
                        الموسم: <strong style={{ color: 'var(--color-gold)' }}>{cls.season_name}</strong>
                      </div>
                    )}
                  </div>

                  {cls.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                      {cls.description}
                    </p>
                  )}
                </div>

                <div>
                  {/* Counts Box */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      background: 'var(--bg-secondary)',
                      padding: '0.65rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1rem',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}>
                      <Users size={16} style={{ color: 'var(--color-success)' }} />
                      <span>الأطفال: <strong style={{ color: 'var(--color-success)', fontWeight: 800 }}>{cls.active_members_count || 0}</strong></span>
                    </div>

                    <div style={{ width: '1px', background: 'var(--border-subtle)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}>
                      <GraduationCap size={16} style={{ color: 'var(--color-primary-light)' }} />
                      <span>الخدام: <strong style={{ color: 'var(--color-primary-light)', fontWeight: 800 }}>{cls.active_servants_count || 0}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                      onClick={() => navigate(`/classes/${cls.class_id}`)}
                    >
                      عرض التفاصيل والأعضاء 📋
                    </button>

                    {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 0.65rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.35)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(cls);
                        }}
                        title="حذف الفصل نهائياً"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
