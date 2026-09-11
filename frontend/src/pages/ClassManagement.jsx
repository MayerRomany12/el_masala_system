import React, { useState, useEffect } from 'react';
import api from '../utils/api';
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
  Layers,
  GraduationCap
} from 'lucide-react';

export const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('Regular');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ from_class_id: '', to_class_id: '', member_id: '' });

  // Class detail drawer state
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'servants'
  const [classMembers, setClassMembers] = useState([]);
  const [classServants, setClassServants] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // New Class Form
  const [newClass, setNewClass] = useState({
    name: '',
    group_type: 'Regular',
    season_id: '',
    stage: 'ابتدائي',
    educational_year: 'الصف الأول الابتدائي',
    description: ''
  });

  // Assign Servant / Add Member input
  const [memberIdToAdd, setMemberIdToAdd] = useState('');
  const [servantIdToAdd, setServantIdToAdd] = useState('');
  const [servantRole, setServantRole] = useState('Servant');

  useEffect(() => {
    fetchClasses();
    fetchSeasons();
  }, [filterType, filterSeason, filterStage]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType) params.group_type = filterType;
      if (filterSeason) params.season_id = filterSeason;
      if (filterStage) params.stage = filterStage;

      const res = await api.get('/classes', { params });
      setClasses(res.data.data.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذر جلب قائمة الفصول والمجموعات');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasons = async () => {
    try {
      const res = await api.get('/seasons');
      setSeasons(res.data.data.items || []);
    } catch (err) {
      console.error('Failed to load seasons', err);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await api.post('/classes', newClass);
      setSuccess('تم إنشاء الفصل/المجموعة بنجاح 🎉');
      setShowCreateModal(false);
      setNewClass({ name: '', group_type: 'Regular', season_id: '', stage: 'ابتدائي', educational_year: '', description: '' });
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذر إنشاء الفصل');
    }
  };

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setLoadingDetails(true);
    try {
      const [mRes, sRes] = await Promise.all([
        api.get(`/classes/${cls.class_id}/members`),
        api.get(`/classes/${cls.class_id}/servants`)
      ]);
      setClassMembers(mRes.data.data.items || []);
      setClassServants(sRes.data.data.items || []);
    } catch (err) {
      setError('تعذر جلب تفاصيل أعضاء وخدام الفصل');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberIdToAdd.trim() || !selectedClass) return;
    try {
      setError('');
      await api.post(`/classes/${selectedClass.class_id}/members`, { member_id: memberIdToAdd.trim() });
      setSuccess('تم إضافة المخدوم للفصل بنجاح');
      setMemberIdToAdd('');
      handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذر إضافة المخدوم للفصل');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedClass || !window.confirm('هل أنت تأكد من إنهاء عضوية الطفل في هذا الفصل؟')) return;
    try {
      setError('');
      await api.delete(`/classes/${selectedClass.class_id}/members/${memberId}`);
      setSuccess('تم إنهاء عضوية الطفل بنجاح');
      handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذر إنهاء العضوية');
    }
  };

  const handleAssignServant = async () => {
    if (!servantIdToAdd.trim() || !selectedClass) return;
    try {
      setError('');
      await api.post(`/classes/${selectedClass.class_id}/servants`, {
        servant_id: servantIdToAdd.trim(),
        role: servantRole
      });
      setSuccess('تم تعيين الخادم للفصل بنجاح');
      setServantIdToAdd('');
      handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذر تعيين الخادم');
    }
  };

  const handleUnassignServant = async (servantId) => {
    if (!selectedClass || !window.confirm('هل أنت تأكد من إخراج الخادم من الفصل؟')) return;
    try {
      setError('');
      await api.delete(`/classes/${selectedClass.class_id}/servants/${servantId}`);
      setSuccess('تم إخراج الخادم بنجاح');
      handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذر إخراج الخادم');
    }
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await api.post('/classes/transfer-member', transferData);
      setSuccess('تم نقل المخدوم بنجاح وحفظ تاريخ الانتقال 🔄');
      setShowTransferModal(false);
      if (selectedClass) handleSelectClass(selectedClass);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذر إتمام عملية نقل المخدوم');
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold-light)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FolderKanban size={28} />
            إدارة الفصول والمجموعات الخدمية
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            توزيع الخدام والمخدومين وتتبع تاريخ الانتقالات والمبررات الإدارية
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
          <Plus size={18} />
          إنشاء فصل / مجموعة جديدة
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

      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} style={{ color: 'var(--color-gold)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>التصفية:</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${filterType === 'Regular' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('Regular')}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
          >
            الفصول الخدمية الأساسية
          </button>
          <button
            className={`btn ${filterType === 'Summer' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('Summer')}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
          >
            مجموعات النشاط الصيفي
          </button>
        </div>

        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="form-control"
          style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <option value="">جميع المراحل الدراسية</option>
          <option value="حضانة">حضانة</option>
          <option value="ابتدائي">ابتدائي</option>
          <option value="إعدادي">إعدادي</option>
          <option value="ثانوي">ثانوي</option>
          <option value="جامعيين وخريجين">جامعيين وخريجين</option>
        </select>

        <select
          value={filterSeason}
          onChange={(e) => setFilterSeason(e.target.value)}
          className="form-control"
          style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <option value="">جميع المواسم الخدمية</option>
          {seasons.map(s => (
            <option key={s.season_id} value={s.season_id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Grid of Classes */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>جاري تحميل الفصول والمجموعات...</div>
      ) : classes.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FolderKanban size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>لا توجد فصول أو مجموعات مسجلة</h3>
          <p style={{ color: 'var(--text-muted)' }}>اضغط على "إنشاء فصل جديد" للبدء في تنظيم الفصول والتوزيع.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {classes.map(cls => (
            <div
              key={cls.class_id}
              className="glass-card"
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: selectedClass?.class_id === cls.class_id ? '2px solid var(--color-gold)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => handleSelectClass(cls)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: cls.group_type === 'Summer' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(122, 8, 29, 0.2)', color: cls.group_type === 'Summer' ? 'var(--color-gold-light)' : '#ff6b81', fontWeight: 700 }}>
                    {cls.group_type === 'Summer' ? 'نشاط صيفي' : 'فصل خدمي'}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)' }}>{cls.name}</h3>
                </div>
                <span className="badge" style={{ fontSize: '0.75rem' }}>{cls.class_id}</span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <div>المرحلة: <strong style={{ color: '#fff' }}>{cls.stage || 'غير محددة'}</strong></div>
                {cls.season_name && <div>الموسم: <strong style={{ color: 'var(--color-gold-light)' }}>{cls.season_name}</strong></div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={16} style={{ color: 'var(--color-gold)' }} />
                  <span>الأطفال: <strong>{cls.active_members_count}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <GraduationCap size={16} style={{ color: '#4ecdc4' }} />
                  <span>الخدام: <strong>{cls.active_servants_count}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Class Detail Modal / Drawer */}
      {selectedClass && (
        <div className="modal-backdrop" onClick={() => setSelectedClass(null)}>
          <div className="modal-content glass-card" style={{ maxWidth: '800px', width: '90%', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-gold-light)' }}>{selectedClass.name}</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>كود الفصل: {selectedClass.class_id}</span>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedClass(null)}>إغلاق</button>
            </div>

            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
              <button
                style={{ padding: '0.6rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'members' ? '2px solid var(--color-gold)' : 'none', color: activeTab === 'members' ? 'var(--color-gold-light)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setActiveTab('members')}
              >
                المخدومون والأطفال ({classMembers.length})
              </button>
              <button
                style={{ padding: '0.6rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'servants' ? '2px solid var(--color-gold)' : 'none', color: activeTab === 'servants' ? 'var(--color-gold-light)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setActiveTab('servants')}
              >
                خدام الفصل ({classServants.length})
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>جاري التحميل...</div>
            ) : activeTab === 'members' ? (
              <div>
                {/* Add Member Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="أدخل رمز المخدوم (مثال: K-123456)"
                    className="form-control"
                    value={memberIdToAdd}
                    onChange={e => setMemberIdToAdd(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" onClick={handleAddMember}>إضافة طفل للفصل</button>
                </div>

                {/* Members List */}
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {classMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا يوجد أطفال مسجلون بهذا الفصل حالياً</div>
                  ) : (
                    <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>رمز العضوية</th>
                          <th>اسم الطفل</th>
                          <th>تاريخ الانضمام</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classMembers.map(m => (
                          <tr key={m.membership_id}>
                            <td>{m.member_id}</td>
                            <td style={{ fontWeight: 700 }}>{m.full_name}</td>
                            <td>{new Date(m.joined_at).toLocaleDateString('ar-EG')}</td>
                            <td style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setTransferData({ from_class_id: selectedClass.class_id, to_class_id: '', member_id: m.member_id });
                                  setShowTransferModal(true);
                                }}
                              >
                                <ArrowLeftRight size={14} /> نقل لفصل آخر
                              </button>
                              <button
                                className="btn btn-error"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleRemoveMember(m.member_id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Add Servant Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="أدخل كود الخادم / المستخدم"
                    className="form-control"
                    value={servantIdToAdd}
                    onChange={e => setServantIdToAdd(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="form-control"
                    value={servantRole}
                    onChange={e => setServantRole(e.target.value)}
                    style={{ width: 'auto' }}
                  >
                    <option value="Servant">خادم</option>
                    <option value="LeadServant">أمين فصل</option>
                  </select>
                  <button className="btn btn-primary" onClick={handleAssignServant}>تعيين خادم</button>
                </div>

                {/* Servants List */}
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {classServants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا يوجد خدام معينون بهذا الفصل</div>
                  ) : (
                    <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>كود الخادم</th>
                          <th>اسم الخادم</th>
                          <th>الدور بالفصل</th>
                          <th>رقم الهاتف</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classServants.map(s => (
                          <tr key={s.assignment_id}>
                            <td>{s.servant_id}</td>
                            <td style={{ fontWeight: 700 }}>{s.full_name}</td>
                            <td>
                              <span className="badge" style={{ background: s.role === 'LeadServant' ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)' }}>
                                {s.role === 'LeadServant' ? 'أمين فصل ⭐' : 'خادم'}
                              </span>
                            </td>
                            <td>{s.phone}</td>
                            <td>
                              <button
                                className="btn btn-error"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleUnassignServant(s.servant_id)}
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
          </div>
        </div>
      )}

      {/* Transfer Member Modal */}
      {showTransferModal && (
        <div className="modal-backdrop" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '500px', width: '90%', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-gold-light)', marginBottom: '1rem' }}>
              نقل المخدوم بين الفصول (Atomic Transfer)
            </h3>
            <form onSubmit={handleExecuteTransfer}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">الفصل الجديد المراد النقل إليه:</label>
                <select
                  required
                  className="form-control"
                  value={transferData.to_class_id}
                  onChange={e => setTransferData({ ...transferData, to_class_id: e.target.value })}
                >
                  <option value="">اختر الفصل الجديد...</option>
                  {classes.filter(c => c.class_id !== transferData.from_class_id).map(c => (
                    <option key={c.class_id} value={c.class_id}>{c.name} ({c.class_id})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">تأكيد النقل الذري 🔄</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '550px', width: '90%', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-gold-light)', marginBottom: '1rem' }}>
              إنشاء فصل أو مجموعة خدمة جديدة
            </h3>
            <form onSubmit={handleCreateClass}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">اسم الفصل / المجموعة:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فصل أولي وثانية ابتدائي (أ)"
                  className="form-control"
                  value={newClass.name}
                  onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">نوع المجموعة:</label>
                  <select
                    className="form-control"
                    value={newClass.group_type}
                    onChange={e => setNewClass({ ...newClass, group_type: e.target.value })}
                  >
                    <option value="Regular">فصل خدمي أساسي</option>
                    <option value="Summer">مجموعة نشاط صيفي</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">المرحلة الدراسية:</label>
                  <select
                    className="form-control"
                    value={newClass.stage}
                    onChange={e => setNewClass({ ...newClass, stage: e.target.value })}
                  >
                    <option value="حضانة">حضانة</option>
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="إعدادي">إعدادي</option>
                    <option value="ثانوي">ثانوي</option>
                    <option value="جامعيين وخريجين">جامعيين وخريجين</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">الموسم الخدمي المرتبط:</label>
                <select
                  className="form-control"
                  value={newClass.season_id}
                  onChange={e => setNewClass({ ...newClass, season_id: e.target.value })}
                >
                  <option value="">بدون موسم محدد (عام)</option>
                  {seasons.map(s => (
                    <option key={s.season_id} value={s.season_id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">وصف مختصر:</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={newClass.description}
                  onChange={e => setNewClass({ ...newClass, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ الفصل الجديد</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
