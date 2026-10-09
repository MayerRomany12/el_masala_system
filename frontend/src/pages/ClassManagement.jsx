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
  Trash2,
  Edit3,
  X
} from 'lucide-react';

export const ClassManagement = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

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
      notifySuccess(`تم حذف فصل "${cls.name}" بنجاح ولن يعود مجدداً`);
      fetchClasses(true);
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'فشل حذف الفصل');
    }
  };

  const handleWipeAllClassesAndAttendance = async () => {
    const confirm1 = window.confirm('⚠️ تحذير شديد الأهمية:\n\nهل تريد مسح جميع الفصول وجلسات وسجلات الحضور السابقة نهائياً للبدء على نظافة؟\n\nلن تعود الفصول المحذوفة مجدداً بعد هذا الإجراء.');
    if (!confirm1) return;
    const confirm2 = window.prompt('للتأكيد النهائي، اكتب كلمة "نظافة" في المربع أدناه:');
    if (confirm2 !== 'نظافة') {
      alert('تم إلغاء عملية المسح.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/classes/wipe-clean');
      notifySuccess(res.data?.message || 'تم مسح الفصول وجلسات الحضور بنجاح');
      fetchClasses(true);
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'فشلت عملية مسح البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ─── Edit Class State & Handlers ──────────────────────────────────────────
  const [editingClass, setEditingClass] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    stage: '',
    group_type: 'Regular',
    season_id: '',
    educational_year: '',
    description: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEdit = (cls) => {
    setEditingClass(cls);
    setEditForm({
      name: cls.name || '',
      stage: cls.stage || '',
      group_type: cls.group_type || 'Regular',
      season_id: cls.season_id || '',
      educational_year: cls.educational_year || '',
      description: cls.description || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      notifyError('يرجى كتابة اسم الفصل');
      return;
    }
    setSavingEdit(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        stage: editForm.stage || null,
        group_type: editForm.group_type,
        season_id: editForm.season_id || null,
        educational_year: editForm.educational_year || null,
        description: editForm.description || null
      };
      await apiClient.put(`/classes/${editingClass.class_id}`, payload);
      notifySuccess(`تم تحديث اسم وبيانات فصل "${editForm.name}" بنجاح ✨`);
      setEditingClass(null);
      fetchClasses(true);
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'فشل تحديث بيانات الفصل');
    } finally {
      setSavingEdit(false);
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

  const stageOptions = ['الكل (ALL)', 'حضانة', 'ابتدائي', 'إعدادي', 'ثانوي', 'جامعيين', 'خريجين'];

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
          {(user?.role === 'Super Admin' || user?.role === 'Admin') && hasPermission('classes:manage') && (
            <button
              className="btn btn-secondary"
              onClick={handleWipeAllClassesAndAttendance}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              title="مسح كافة الفصول القديمة وجلسات الحضور للبدء على نظافة تامة"
            >
              <Trash2 size={15} />
              <span>مسح الفصول والحضور (بدء على نظافة) 🧹</span>
            </button>
          )}

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

          {hasPermission('classes:manage') && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/classes/new')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>إنشاء فصل جديد</span>
            </button>
          )}
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
          {hasPermission('classes:manage') && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/classes/new')}
              style={{ fontSize: '0.85rem' }}
            >
              <Plus size={15} />
              <span>إنشاء فصل جديد الآن</span>
            </button>
          )}
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
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                      onClick={() => navigate(`/classes/${cls.class_id}`)}
                    >
                      عرض التفاصيل والأعضاء 📋
                    </button>

                    {hasPermission('classes:manage') && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 0.65rem', color: 'var(--color-primary-light)', borderColor: 'rgba(56, 189, 248, 0.35)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(cls);
                        }}
                        title="تعديل اسم وبيانات الفصل ✏️"
                      >
                        <Edit3 size={15} />
                      </button>
                    )}

                    {hasPermission('classes:manage') && (user?.role === 'Super Admin' || user?.role === 'Admin') && (
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

      {/* ─── Edit Class Modal ──────────────────────────────────────────────── */}
      {editingClass && (
        <div className="modal-backdrop" onClick={() => setEditingClass(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} style={{ color: 'var(--color-gold)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>تعديل اسم وبيانات الفصل</h3>
              </div>
              <button className="btn-icon" onClick={() => setEditingClass(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  كود الفصل: <strong style={{ color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{editingClass.class_id}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    اسم الفصل أو المجموعة <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="مثال: فصل أولي وثانية ابتدائي بنين"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">المرحلة الدراسية</label>
                    <select
                      className="form-input"
                      value={editForm.stage}
                      onChange={(e) => setEditForm(prev => ({ ...prev, stage: e.target.value }))}
                    >
                      <option value="">عام (بدون مرحلة محددة)</option>
                      <option value="حضانة">حضانة</option>
                      <option value="ابتدائي">ابتدائي</option>
                      <option value="إعدادي">إعدادي</option>
                      <option value="ثانوي">ثانوي</option>
                      <option value="جامعيين">جامعيين</option>
                      <option value="خريجين">خريجين</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع الخدمة</label>
                    <select
                      className="form-input"
                      value={editForm.group_type}
                      onChange={(e) => setEditForm(prev => ({ ...prev, group_type: e.target.value }))}
                    >
                      <option value="Regular">⛪ مدارس أحد (أساسي)</option>
                      <option value="Summer">☀️ نشاط صيفي</option>
                      <option value="General">🌟 عام</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الموسم الخدمي</label>
                  <select
                    className="form-input"
                    value={editForm.season_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, season_id: e.target.value }))}
                  >
                    <option value="">بدون موسم محدد</option>
                    {seasons.map(s => (
                      <option key={s.season_id} value={s.season_id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">الوصف أو الملاحظات</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="وصف مختصر لطبيعة الفصل أو ميعاد ومكان الانعقاد..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingClass(null)}
                  disabled={savingEdit}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                  style={{ gap: '0.4rem', fontWeight: 700 }}
                >
                  {savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
