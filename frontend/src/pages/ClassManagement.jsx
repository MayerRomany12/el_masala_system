import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../api/client';
import {
  FolderKanban,
  Plus,
  Users,
  UserPlus,
  ArrowLeftRight,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  GraduationCap,
  X,
  RefreshCw,
  Sun,
  Calendar,
  Sparkles,
  Phone,
  Shield,
  Layers
} from 'lucide-react';

export const ClassManagement = () => {
  // ─── Data State ──────────────────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [servantsList, setServantsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Filters & Search State ──────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'Regular' | 'Summer'
  const [filterStage, setFilterStage] = useState('');
  const [filterSeason, setFilterSeason] = useState('');

  // ─── Modals State ─────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ from_class_id: '', to_class_id: '', member_id: '', member_name: '' });

  // ─── Class Detail Modal State ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'members' | 'servants'
  const [classMembers, setClassMembers] = useState([]);
  const [classServants, setClassServants] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Add Member / Servant inputs
  const [memberInput, setMemberInput] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedServantId, setSelectedServantId] = useState('');
  const [servantRole, setServantRole] = useState('Servant');

  // ─── Create Class Form State ──────────────────────────────────────────────
  const [newClass, setNewClass] = useState({
    name: '',
    group_type: 'Regular',
    season_id: '',
    stage: 'ابتدائي',
    educational_year: '',
    description: ''
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

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

  const fetchSeasonsAndServants = useCallback(async () => {
    try {
      const [seasonsRes, usersRes] = await Promise.all([
        apiClient.get('/seasons').catch(() => ({ data: { data: { items: [] } } })),
        apiClient.get('/users').catch(() => ({ data: { data: { items: [] } } }))
      ]);
      setSeasons(seasonsRes.data?.data?.items || []);
      setServantsList(usersRes.data?.data?.items || []);
    } catch (err) {
      console.error('Failed to load auxiliary data', err);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchSeasonsAndServants();
  }, [fetchClasses, fetchSeasonsAndServants]);

  // ─── Live Search for Members to Add ───────────────────────────────────────
  useEffect(() => {
    if (!memberInput.trim() || memberInput.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingMembers(true);
        const res = await apiClient.get('/members', {
          params: { search: memberInput.trim(), limit: 6 }
        });
        setMemberSearchResults(res.data?.data?.items || []);
      } catch (err) {
        // silent fail for autocomplete
      } finally {
        setSearchingMembers(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [memberInput]);

  // ─── Filtered Classes (Client-side for instant responsiveness) ────────────
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (filterType !== 'ALL' && cls.group_type !== filterType) return false;
      if (filterStage && cls.stage !== filterStage) return false;
      if (filterSeason && cls.season_id !== filterSeason) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = (cls.name || '').toLowerCase().includes(query);
        const matchStage = (cls.stage || '').toLowerCase().includes(query);
        const matchId = (cls.class_id || '').toLowerCase().includes(query);
        const matchDesc = (cls.description || '').toLowerCase().includes(query);
        if (!matchName && !matchStage && !matchId && !matchDesc) return false;
      }
      return true;
    });
  }, [classes, filterType, filterStage, filterSeason, searchTerm]);

  // ─── Stats Derived from Loaded Classes ───────────────────────────────────
  const stats = useMemo(() => {
    const total = classes.length;
    const regular = classes.filter((c) => c.group_type === 'Regular').length;
    const summer = classes.filter((c) => c.group_type === 'Summer').length;
    const totalMembers = classes.reduce((sum, c) => sum + (c.active_members_count || 0), 0);
    return { total, regular, summer, totalMembers };
  }, [classes]);

  // ─── Unique Stages for Dropdown ──────────────────────────────────────────
  const stageOptions = useMemo(() => {
    const defaultStages = ['حضانة', 'ابتدائي', 'إعدادي', 'ثانوي', 'جامعيين وخريجين', 'أنشطة عامة'];
    const dynamicStages = classes.map((c) => c.stage).filter(Boolean);
    return Array.from(new Set([...defaultStages, ...dynamicStages]));
  }, [classes]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setActiveTab('all');
    setLoadingDetails(true);
    setMemberInput('');
    setMemberSearchResults([]);
    setMemberSearchTerm('');
    try {
      const [mRes, sRes] = await Promise.all([
        apiClient.get(`/classes/${cls.class_id}/members`),
        apiClient.get(`/classes/${cls.class_id}/servants`)
      ]);
      setClassMembers(mRes.data?.data?.items || []);
      setClassServants(sRes.data?.data?.items || []);
    } catch (err) {
      notifyError('تعذر جلب تفاصيل أعضاء وخدام الفصل');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddMember = async (memberId) => {
    const idToAdd = memberId || memberInput.trim();
    if (!idToAdd || !selectedClass) return;

    try {
      await apiClient.post(`/classes/${selectedClass.class_id}/members`, {
        member_id: idToAdd
      });
      notifySuccess('تم إضافة المخدوم للفصل بنجاح 🎉');
      setMemberInput('');
      setMemberSearchResults([]);
      handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'تعذر إضافة المخدوم للفصل');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!selectedClass) return;
    const confirmed = window.confirm(`هل أنت متأكد من إنهاء عضوية ${memberName || memberId} من هذا الفصل؟`);
    if (!confirmed) return;

    try {
      await apiClient.delete(`/classes/${selectedClass.class_id}/members/${memberId}`);
      notifySuccess('تم إنهاء عضوية المخدوم في الفصل بنجاح');
      handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'تعذر إنهاء العضوية');
    }
  };

  const handleAssignServant = async () => {
    if (!selectedServantId || !selectedClass) {
      notifyError('يرجى اختيار الخادم أولاً');
      return;
    }

    try {
      await apiClient.post(`/classes/${selectedClass.class_id}/servants`, {
        servant_id: selectedServantId,
        role: servantRole
      });
      notifySuccess('تم تعيين الخادم للفصل بنجاح ✝️');
      setSelectedServantId('');
      handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'تعذر تعيين الخادم');
    }
  };

  const handleUnassignServant = async (servantId, servantName) => {
    if (!selectedClass) return;
    const confirmed = window.confirm(`هل أنت متأكد من إخراج الخادم ${servantName || servantId} من الفصل؟`);
    if (!confirmed) return;

    try {
      await apiClient.delete(`/classes/${selectedClass.class_id}/servants/${servantId}`);
      notifySuccess('تم إخراج الخادم من الفصل بنجاح');
      handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'تعذر إخراج الخادم');
    }
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.to_class_id) {
      notifyError('يرجى اختيار الفصل الجديد المراد النقل إليه');
      return;
    }

    try {
      await apiClient.post('/classes/transfer-member', {
        from_class_id: transferData.from_class_id,
        to_class_id: transferData.to_class_id,
        member_id: transferData.member_id
      });
      notifySuccess('تم نقل المخدوم بنجاح وتحديث تاريخ النقل الذري 🔄');
      setShowTransferModal(false);
      if (selectedClass) handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'تعذر إتمام عملية نقل المخدوم');
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name.trim()) return;

    try {
      setSubmittingCreate(true);
      await apiClient.post('/classes', newClass);
      notifySuccess('تم إنشاء الفصل / المجموعة الخدمية بنجاح ✨');
      setShowCreateModal(false);
      setNewClass({
        name: '',
        group_type: 'Regular',
        season_id: '',
        stage: 'ابتدائي',
        educational_year: '',
        description: ''
      });
      fetchClasses();
    } catch (err) {
      notifyError(err.response?.data?.detail || err.response?.data?.message || 'تعذر إنشاء الفصل الجديد');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Filtered members inside the selected class modal
  const filteredClassMembers = useMemo(() => {
    if (!memberSearchTerm.trim()) return classMembers;
    const q = memberSearchTerm.toLowerCase().trim();
    return classMembers.filter(
      (m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.member_id || '').toLowerCase().includes(q)
    );
  }, [classMembers, memberSearchTerm]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ─── Top Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FolderKanban size={30} style={{ color: 'var(--color-gold-main)' }} />
            إدارة الفصول والمجموعات الخدمية
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            تنظيم الفصول الدراسية، مجموعات الأنشطة الصيفية، تعيين الخدام، وتوزيع الأطفال مع حفظ تاريخ الانتقالات
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchClasses(true)}
            disabled={refreshing}
            style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)' }}
            title="تحديث البيانات"
          >
            <RefreshCw size={17} className={refreshing ? 'pulse-gold' : ''} />
            <span>تحديث</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Plus size={18} />
            إنشاء فصل جديد
          </button>
        </div>
      </div>

      {/* ─── Global Notifications ────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* ─── Stats KPI Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold-main)' }}>
            <FolderKanban size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>إجمالي الفصول</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gold-light)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>فصول الخدمة الأساسية</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{stats.regular}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <Sun size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>مجموعات النشاط الصيفي</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{stats.summer}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>الأطفال الموزعون</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{stats.totalMembers}</div>
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingRight: '2.5rem' }}
            placeholder="بحث باسم الفصل، المرحلة، أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Group Type Filter */}
        <div style={{ flex: '0 1 200px' }}>
          <select
            className="form-input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">جميع الأنواع</option>
            <option value="Regular">فصول الخدمة الأساسية</option>
            <option value="Summer">مجموعات النشاط الصيفي</option>
          </select>
        </div>

        {/* Stage Filter */}
        <div style={{ flex: '0 1 180px' }}>
          <select
            className="form-input"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
          >
            <option value="">جميع المراحل الدراسية</option>
            {stageOptions.map((stg) => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>
        </div>

        {/* Season Filter */}
        <div style={{ flex: '0 1 180px' }}>
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

        {/* Clear Filters button */}
        {(searchTerm || filterType !== 'ALL' || filterStage || filterSeason) && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setFilterType('ALL');
              setFilterStage('');
              setFilterSeason('');
            }}
            style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
          >
            إعادة تعيين
          </button>
        )}
      </div>

      {/* ─── Classes Cards Grid ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={36} className="pulse-gold" style={{ margin: '0 auto 1rem auto', display: 'block', color: 'var(--color-gold-main)' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>جاري تحميل الفصول والمجموعات...</div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <FolderKanban size={48} style={{ opacity: 0.35, marginBottom: '1rem', color: 'var(--color-gold-main)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem' }}>لا توجد فصول مطابقة لمعايير البحث</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            يمكنك تغيير معايير التصفية أو إنشاء فصل جديد عبر زر "إنشاء فصل جديد" بالأعلى.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredClasses.map((cls) => {
            const isSelected = selectedClass?.class_id === cls.class_id;
            const isSummer = cls.group_type === 'Summer';

            return (
              <div
                key={cls.class_id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isSelected ? '2px solid var(--color-gold-main)' : undefined,
                  boxShadow: isSelected ? 'var(--shadow-gold-glow)' : undefined,
                  transition: 'all 0.25s ease'
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <span
                      className="badge"
                      style={{
                        background: isSummer ? 'rgba(245, 158, 11, 0.18)' : 'rgba(122, 8, 29, 0.25)',
                        color: isSummer ? '#fbbf24' : '#fca5a5',
                        border: isSummer ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(248, 113, 113, 0.35)'
                      }}
                    >
                      {isSummer ? '☀️ نشاط صيفي' : '⛪ فصل أساسي'}
                    </span>
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-subtle)' }}>
                      {cls.class_id}
                    </span>
                  </div>

                  {/* Title & Stage */}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    {cls.name}
                  </h3>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.9rem' }}>
                    <div>
                      المرحلة: <strong style={{ color: 'var(--text-main)' }}>{cls.stage || 'عام'}</strong>
                    </div>
                    {cls.season_name && (
                      <div>
                        الموسم: <strong style={{ color: 'var(--color-gold-light)' }}>{cls.season_name}</strong>
                      </div>
                    )}
                  </div>

                  {cls.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', marginBottom: '1rem', lineHeight: '1.4' }}>
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
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '0.65rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1rem',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}>
                      <Users size={16} style={{ color: '#34d399' }} />
                      <span>الأطفال: <strong style={{ color: '#34d399', fontWeight: 800 }}>{cls.active_members_count || 0}</strong></span>
                    </div>

                    <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}>
                      <GraduationCap size={16} style={{ color: '#38bdf8' }} />
                      <span>الخدام: <strong style={{ color: '#38bdf8', fontWeight: 800 }}>{cls.active_servants_count || 0}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.88rem' }}
                    onClick={() => handleSelectClass(cls)}
                  >
                    عرض التفاصيل والأعضاء 📋
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Selected Class Detail Modal ─────────────────────────────────────── */}
      {selectedClass && (
        <div className="modal-overlay" onClick={() => setSelectedClass(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '820px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-gold-light)' }}>
                    {selectedClass.name}
                  </h2>
                  <span className="badge" style={{ background: 'rgba(212, 175, 55, 0.2)', color: 'var(--color-gold-light)' }}>
                    {selectedClass.class_id}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  المرحلة: {selectedClass.stage || 'عام'} | النوع: {selectedClass.group_type === 'Summer' ? 'نشاط صيفي' : 'فصل خدمي أساسي'}
                </div>
              </div>

              <button
                onClick={() => setSelectedClass(null)}
                className="btn-secondary"
                style={{ padding: '0.35rem', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* ─── Top Stats KPI Banner ────────────────────────────────── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(250, 204, 21, 0.25)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إجمالي الطلاب</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{classMembers.length} طفل</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الخدام المشرفون</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>{classServants.length} خادم</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(250, 204, 21, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold-main)' }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المرحلة الخدمية</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedClass.stage || 'عام'}</div>
                  </div>
                </div>
              </div>

              {/* Tab Switcher */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.88rem', padding: '0.45rem 1rem' }}
                  onClick={() => setActiveTab('all')}
                >
                  <Sparkles size={15} />
                  نظرة شاملة (الطلاب والخدام معاً)
                </button>

                <button
                  className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.88rem', padding: '0.45rem 1rem' }}
                  onClick={() => setActiveTab('members')}
                >
                  <Users size={15} />
                  قائمة الطلاب ({classMembers.length})
                </button>

                <button
                  className={`btn ${activeTab === 'servants' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.88rem', padding: '0.45rem 1rem' }}
                  onClick={() => setActiveTab('servants')}
                >
                  <GraduationCap size={15} />
                  خدام الفصل ({classServants.length})
                </button>
              </div>

              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={28} className="pulse-gold" style={{ margin: '0 auto 0.75rem auto', display: 'block', color: 'var(--color-gold-main)' }} />
                  جاري جلب بيانات الفصل...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* ─── قسم خدام الفصل المشرفين (يظهر في الكل أو الخدام) ─── */}
                  {(activeTab === 'all' || activeTab === 'servants') && (
                    <div className="glass-card" style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.04)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <GraduationCap size={18} />
                          <span>خدام الفصل المشرفون ({classServants.length})</span>
                        </h4>
                      </div>

                      {/* تعيين خادم جديد للفصل */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                        <div style={{ flex: '1 1 220px' }}>
                          <select
                            className="form-input"
                            value={selectedServantId}
                            onChange={(e) => setSelectedServantId(e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.7rem' }}
                          >
                            <option value="">— إضافة خادم لهذا الفصل —</option>
                            {servantsList.map((srv) => (
                              <option key={srv.user_id} value={srv.user_id}>
                                {srv.full_name || srv.username} ({srv.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ flex: '0 1 140px' }}>
                          <select
                            className="form-input"
                            value={servantRole}
                            onChange={(e) => setServantRole(e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.7rem' }}
                          >
                            <option value="Servant">خادم</option>
                            <option value="LeadServant">أمين فصل ⭐</option>
                          </select>
                        </div>

                        <button
                          className="btn btn-primary"
                          onClick={handleAssignServant}
                          disabled={!selectedServantId}
                          style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                        >
                          <UserPlus size={15} />
                          تعيين للفصل
                        </button>
                      </div>

                      {/* جدول خدام الفصل */}
                      <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {classServants.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                            لم يتم تعيين خدام لهذا الفصل بعد. اختر خادماً من القائمة بالأعلى لتعيينه.
                          </div>
                        ) : (
                          <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th>اسم الخادم</th>
                                <th>المسئولية</th>
                                <th>رقم الهاتف</th>
                                <th style={{ textAlign: 'center' }}>إجراء</th>
                              </tr>
                            </thead>
                            <tbody>
                              {classServants.map((s) => (
                                <tr key={s.assignment_id || s.servant_id}>
                                  <td>
                                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.full_name || s.servant_id}</div>
                                  </td>
                                  <td>
                                    <span
                                      className="badge"
                                      style={{
                                        background: s.role === 'LeadServant' ? 'rgba(212, 175, 55, 0.25)' : 'rgba(52, 211, 153, 0.18)',
                                        color: s.role === 'LeadServant' ? 'var(--color-gold-light)' : '#34d399',
                                        border: s.role === 'LeadServant' ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(52, 211, 153, 0.35)'
                                      }}
                                    >
                                      {s.role === 'LeadServant' ? 'أمين فصل ⭐' : 'خادم'}
                                    </span>
                                  </td>
                                  <td style={{ color: 'var(--text-muted)' }}>
                                    {s.phone ? (
                                      <a href={`tel:${s.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', textDecoration: 'none' }}>
                                        <Phone size={12} />
                                        <span>{s.phone}</span>
                                      </a>
                                    ) : '—'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
                                      title="إخراج الخادم من الفصل"
                                      onClick={() => handleUnassignServant(s.servant_id, s.full_name)}
                                    >
                                      إخراج
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── قسم أطفال وطلاب الفصل (يظهر في الكل أو الطلاب) ─── */}
                  {(activeTab === 'all' || activeTab === 'members') && (
                    <div className="glass-card" style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.03)', borderColor: 'rgba(52, 211, 153, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={18} />
                          <span>الطلاب والمخدومون المقيدون ({classMembers.length})</span>
                        </h4>
                      </div>

                      {/* إضافة طفل للفصل */}
                      <div style={{ display: 'flex', gap: '0.5rem', position: 'relative', marginBottom: '0.85rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="ابحث بالاسم لإضافة طفل لهذا الفصل..."
                            value={memberInput}
                            onChange={(e) => setMemberInput(e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                          />

                          {memberSearchResults.length > 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#0a1d37',
                                border: '1px solid var(--color-gold-main)',
                                borderRadius: 'var(--radius-sm)',
                                zIndex: 100,
                                marginTop: '4px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                                overflow: 'hidden'
                              }}
                            >
                              {memberSearchResults.map((sm) => (
                                <div
                                  key={sm.member_id}
                                  style={{
                                    padding: '0.6rem 0.9rem',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  onClick={() => handleAddMember(sm.member_id)}
                                >
                                  <div>
                                    <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{sm.full_name}</strong>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>({sm.stage || 'عام'})</span>
                                  </div>
                                  <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                                    {sm.member_id} + إضافة
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          className="btn btn-primary"
                          onClick={() => handleAddMember()}
                          disabled={!memberInput.trim()}
                          style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                        >
                          <UserPlus size={15} />
                          إضافة طفل
                        </button>
                      </div>

                      {/* بحث سريع في أعضاء الفصل إذا كان العدد أكثر من 4 */}
                      {classMembers.length > 4 && (
                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                          <Search size={15} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            className="form-input"
                            style={{ paddingRight: '2.2rem', fontSize: '0.82rem', padding: '0.4rem 2.2rem 0.4rem 0.8rem' }}
                            placeholder="تصفية أعضاء هذا الفصل بالاسم أو الرمز..."
                            value={memberSearchTerm}
                            onChange={(e) => setMemberSearchTerm(e.target.value)}
                          />
                        </div>
                      )}

                      {/* جدول الطلاب */}
                      <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {classMembers.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                            لا يوجد أطفال مسجلون في هذا الفصل حالياً. يمكنك إضافة أطفال عبر حقل البحث بالأعلى.
                          </div>
                        ) : filteredClassMembers.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                            لا توجد نتائج مطابقة لبحث الأعضاء
                          </div>
                        ) : (
                          <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th>رمز الطفل</th>
                                <th>الاسم الكامل</th>
                                <th>الهاتف / ولي الأمر</th>
                                <th>تاريخ الانضمام</th>
                                <th style={{ textAlign: 'center' }}>الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredClassMembers.map((m) => (
                                <tr key={m.membership_id || m.member_id}>
                                  <td>
                                    <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                      {m.member_id}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 700 }}>{m.full_name}</td>
                                  <td style={{ color: 'var(--text-muted)' }}>
                                    {m.phone ? (
                                      <a href={`tel:${m.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', textDecoration: 'none' }}>
                                        <Phone size={12} />
                                        <span>{m.phone}</span>
                                      </a>
                                    ) : '—'}
                                  </td>
                                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    {m.joined_at ? new Date(m.joined_at).toLocaleDateString('ar-EG') : '—'}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                      <button
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', gap: '0.25rem' }}
                                        title="نقل لفصل آخر"
                                        onClick={() => {
                                          setTransferData({
                                            from_class_id: selectedClass.class_id,
                                            to_class_id: '',
                                            member_id: m.member_id,
                                            member_name: m.full_name
                                          });
                                          setShowTransferModal(true);
                                        }}
                                      >
                                        <ArrowLeftRight size={12} />
                                        <span>نقل</span>
                                      </button>

                                      <button
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
                                        title="إنهاء العضوية من الفصل"
                                        onClick={() => handleRemoveMember(m.member_id, m.full_name)}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedClass(null)}>
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Transfer Member Modal ───────────────────────────────────────────── */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--color-gold-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeftRight size={20} />
                نقل المخدوم بين الفصول
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer}>
              <div className="modal-body">
                {transferData.member_name && (
                  <div style={{ padding: '0.75rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المخدوم المراد نقله:</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem', marginTop: '0.2rem' }}>
                      {transferData.member_name} ({transferData.member_id})
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">اختر الفصل الجديد المراد النقل إليه*:</label>
                  <select
                    required
                    className="form-input"
                    value={transferData.to_class_id}
                    onChange={(e) => setTransferData({ ...transferData, to_class_id: e.target.value })}
                  >
                    <option value="">— اختر الفصل الجديد —</option>
                    {classes
                      .filter((c) => c.class_id !== transferData.from_class_id)
                      .map((c) => (
                        <option key={c.class_id} value={c.class_id}>
                          {c.name} ({c.stage || 'عام'} - {c.group_type === 'Summer' ? 'صيفي' : 'أساسي'})
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', lineHeight: '1.5' }}>
                  ℹ️ سيتم إنهاء العضوية في الفصل الحالي وتفعيلها في الفصل الجديد مع توثيق تاريخ النقل الذري تلقائياً.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  تأكيد النقل الذري 🔄
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Create Class Modal ──────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--color-gold-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} />
                إنشاء فصل أو مجموعة خدمة جديدة
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClass}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم الفصل / المجموعة*:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فصل خامسة وسادسة ابتدائي (بنين)"
                    className="form-input"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">نوع المجموعة*:</label>
                    <select
                      className="form-input"
                      value={newClass.group_type}
                      onChange={(e) => setNewClass({ ...newClass, group_type: e.target.value })}
                    >
                      <option value="Regular">فصل خدمي أساسي</option>
                      <option value="Summer">مجموعة نشاط صيفي</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">المرحلة الدراسية*:</label>
                    <select
                      className="form-input"
                      value={newClass.stage}
                      onChange={(e) => setNewClass({ ...newClass, stage: e.target.value })}
                    >
                      <option value="حضانة">حضانة</option>
                      <option value="ابتدائي">ابتدائي</option>
                      <option value="إعدادي">إعدادي</option>
                      <option value="ثانوي">ثانوي</option>
                      <option value="جامعيين وخريجين">جامعيين وخريجين</option>
                      <option value="أنشطة عامة">أنشطة عامة (ألحان / قداس / كورال)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الموسم الخدمي (اختياري / للنشاط الصيفي):</label>
                  <select
                    className="form-input"
                    value={newClass.season_id}
                    onChange={(e) => setNewClass({ ...newClass, season_id: e.target.value })}
                  >
                    <option value="">بدون موسم محدد (عام ومستمر)</option>
                    {seasons.map((s) => (
                      <option key={s.season_id} value={s.season_id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">وصف مختصر:</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="وصف مختصر للأنشطة أو الفئة المستهدفة..."
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingCreate}>
                  {submittingCreate ? 'جاري الحفظ...' : 'حفظ الفصل الجديد'}
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
