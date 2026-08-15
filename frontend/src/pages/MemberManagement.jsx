import React, { useEffect, useState, useCallback } from 'react';
import { membersApi } from '../api/members';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  Edit,
  Eye,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  ShieldAlert,
  Calendar,
  Heart,
  MapPin,
  FileText
} from 'lucide-react';

const STAGE_OPTIONS = [
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
  'جامعة وخريجين',
  'خدمات خاصة'
];

export const MemberManagement = () => {
  const { hasPermission } = useAuth();

  // Data States
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    inactive_members: 0,
    stages_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [statusModalMember, setStatusModalMember] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'ذكر',
    date_of_birth: '',
    stage: 'ابتدائي - الصف الأول',
    group_name: '',
    phone: '',
    whatsapp_phone: '',
    father_of_confession: '',
    address: '',
    notes: '',
    status: 'Active'
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, statsRes] = await Promise.all([
        membersApi.getMembers({
          search: searchTerm,
          stage: selectedStage,
          status: selectedStatus,
          page,
          limit: 20
        }),
        membersApi.getStats()
      ]);

      if (membersRes.success) {
        setMembers(membersRes.data.items);
        setTotalItems(membersRes.data.total);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر تحميل بيانات المخدومين');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedStage, selectedStatus, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingMember(null);
    setFormData({
      full_name: '',
      gender: 'ذكر',
      date_of_birth: '',
      stage: 'ابتدائي - الصف الأول',
      group_name: '',
      phone: '',
      whatsapp_phone: '',
      father_of_confession: '',
      address: '',
      notes: '',
      status: 'Active'
    });
    setModalError('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name || '',
      gender: member.gender || 'ذكر',
      date_of_birth: member.date_of_birth || '',
      stage: member.stage || 'ابتدائي - الصف الأول',
      group_name: member.group_name || '',
      phone: member.phone || '',
      whatsapp_phone: member.whatsapp_phone || '',
      father_of_confession: member.father_of_confession || '',
      address: member.address || '',
      notes: member.notes || '',
      status: member.status || 'Active'
    });
    setModalError('');
    setShowAddModal(true);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);

    try {
      if (editingMember) {
        await membersApi.updateMember(editingMember.member_id, formData);
      } else {
        await membersApi.createMember(formData);
      }
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'تعذر حفظ بيانات المخدوم');
    } finally {
      setSubmitting(false);
    }
  };

  // Change Status
  const handleUpdateStatus = async (newStatus) => {
    if (!statusModalMember) return;
    setSubmitting(true);
    try {
      await membersApi.updateStatus(statusModalMember.member_id, newStatus);
      setStatusModalMember(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل تغيير الحالة');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="badge badge-success">نشط</span>;
      case 'Inactive':
        return <span className="badge badge-warning">غير نشط</span>;
      case 'Archived':
        return <span className="badge badge-danger">مؤرشف</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} style={{ color: '#38bdf8' }} />
            <span>إدارة الأطفال والأعضاء</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            تسجيل وإدارة بيانات المخدومين بالرمز الفريد الدائم K-XXXXXX المولد عشوائياً بدون إمكانية الحذف الفعلي للحفاظ على السجل التاريخي
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>تحديث</span>
          </button>
          {hasPermission('members:write') && (
            <button onClick={handleOpenCreate} className="btn btn-primary">
              <UserPlus size={18} />
              <span>إضافة مخدوم جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Stats Header Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>إجمالي المخدومين</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total_members}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>الأطفال النشطين</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{stats.active_members}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(251, 146, 60, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>غير نشط / مؤرشف</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fb923c' }}>{stats.inactive_members}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>المراحل الخدمية</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc' }}>{stats.stages_count}</div>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingRight: '2.5rem' }}
            placeholder="بحث بالاسم، التليفون، أو الرمز K-XXXXXX..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>

        {/* Stage Filter */}
        <div style={{ flex: '0 1 200px' }}>
          <select
            className="form-input"
            value={selectedStage}
            onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }}
          >
            <option value="">كل المراحل الدراسية</option>
            {STAGE_OPTIONS.map((stg) => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '0 1 150px' }}>
          <select
            className="form-input"
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
          >
            <option value="">كل الحالات</option>
            <option value="Active">نشط (Active)</option>
            <option value="Inactive">غير نشط (Inactive)</option>
            <option value="Archived">مؤرشف (Archived)</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'var(--danger-glow)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-sm)',
          color: '#fca5a5',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Members Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>رمز العضوية ID</th>
                <th>اسم الطفل المخدوم</th>
                <th>المرحلة والفصل</th>
                <th>تليفون ولي الأمر</th>
                <th>الحالة</th>
                <th>تاريخ التسجيل</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    جاري تحميل بيانات المخدومين...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    لا يوجد مخدومين يطابقون خيارات البحث الحالية.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.member_id}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.1)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(56, 189, 248, 0.2)'
                      }}>
                        {member.member_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{member.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الجنس: {member.gender}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{member.stage}</div>
                      {member.group_name && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>فصل: {member.group_name}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <a
                          href={`tel:${member.phone}`}
                          style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Phone size={14} />
                          <span>{member.phone}</span>
                        </a>
                        {member.whatsapp_phone && (
                          <a
                            href={`https://wa.me/${member.whatsapp_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#34d399', textDecoration: 'none' }}
                            title="مراسلة عبر واتساب"
                          >
                            <MessageSquare size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td>{getStatusBadge(member.status)}</td>
                    <td style={{ color: 'var(--text-subtle)', fontSize: '0.82rem' }}>
                      {new Date(member.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => setViewingMember(member)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="عرض الملف الكامل"
                        >
                          <Eye size={15} />
                        </button>
                        {hasPermission('members:write') && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(member)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                              title="تعديل البيانات"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => setStatusModalMember(member)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#fb923c' }}
                              title="تغيير الحالة"
                            >
                              <ShieldAlert size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Add / Edit Member Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {editingMember ? `تعديل بيانات الطفل (${editingMember.member_id})` : 'تسجيل طفل مخدوم جديد'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {modalError && (
                <div style={{ padding: '0.75rem', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}

              <form id="memberForm" onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">الاسم الكامل للطفل (الثلاثي / الرباعي)*</label>
                    <input
                      type="text" className="form-input" value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="مثال: مارك فادي نبيل" required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">الجنس*</label>
                    <select className="form-input" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">المرحلة الدراسية / الخدمية*</label>
                    <select className="form-input" value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })}>
                      {STAGE_OPTIONS.map((stg) => (
                        <option key={stg} value={stg}>{stg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">اسم الأسرة / الفصل (اختياري)</label>
                    <input
                      type="text" className="form-input" value={formData.group_name}
                      onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                      placeholder="مثال: أسرة القديس مارمرقس"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">تليفون ولي الأمر الرئيسي*</label>
                    <input
                      type="tel" className="form-input" value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="012XXXXXXXX" required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">رقم الواتساب (اختياري)</label>
                    <input
                      type="tel" className="form-input" value={formData.whatsapp_phone}
                      onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
                      placeholder="012XXXXXXXX"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">تاريخ الميلاد (اختياري)</label>
                    <input
                      type="date" className="form-input" value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">اسم أب الاعتراف (اختياري)</label>
                    <input
                      type="text" className="form-input" value={formData.father_of_confession}
                      onChange={(e) => setFormData({ ...formData, father_of_confession: e.target.value })}
                      placeholder="مثال: القمص يوحنا"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">عنوان السكن (اختياري)</label>
                  <input
                    type="text" className="form-input" value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="منطقة المسلة - الشارع..."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ملاحظات خدمة ورعاية خاصة</label>
                  <textarea
                    className="form-input" rows={2} value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="أي ملاحظات خاصة بالتلميذ أو الظروف الصحية..."
                  />
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" disabled={submitting}>إلغاء</button>
              <button type="submit" form="memberForm" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : editingMember ? 'تعديل البيانات' : 'حفظ وتسجيل المخدوم 💾'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. View Member Profile Modal */}
      {viewingMember && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '550px',
            background: '#1e293b',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.15)',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  {viewingMember.member_id}
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                  {viewingMember.full_name}
                </h2>
              </div>
              <button onClick={() => setViewingMember(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} /> المرحلة والدراسة:
                </span>
                <span style={{ fontWeight: 700 }}>{viewingMember.stage} {viewingMember.group_name && `(${viewingMember.group_name})`}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={16} /> تليفون ولي الأمر:
                </span>
                <span style={{ fontWeight: 700, dir: 'ltr' }}>{viewingMember.phone}</span>
              </div>

              {viewingMember.whatsapp_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MessageSquare size={16} /> الواتساب:
                  </span>
                  <span style={{ fontWeight: 700, color: '#34d399', dir: 'ltr' }}>{viewingMember.whatsapp_phone}</span>
                </div>
              )}

              {viewingMember.date_of_birth && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} /> تاريخ الميلاد:
                  </span>
                  <span style={{ fontWeight: 700 }}>{viewingMember.date_of_birth}</span>
                </div>
              )}

              {viewingMember.father_of_confession && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Heart size={16} /> أب الاعتراف:
                  </span>
                  <span style={{ fontWeight: 700 }}>{viewingMember.father_of_confession}</span>
                </div>
              )}

              {viewingMember.address && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={16} /> العنوان:
                  </span>
                  <span style={{ fontWeight: 600 }}>{viewingMember.address}</span>
                </div>
              )}

              {viewingMember.notes && (
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <FileText size={16} /> ملاحظات:
                  </span>
                  <p style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    {viewingMember.notes}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.3rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>حالة الحساب:</span>
                <div>{getStatusBadge(viewingMember.status)}</div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setViewingMember(null)} className="btn btn-secondary">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Change Status Modal */}
      {statusModalMember && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '450px',
            background: '#1e293b',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              تغيير حالة المخدوم ({statusModalMember.full_name})
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              المعرف الرمز الدائم <strong style={{ color: '#38bdf8' }}>{statusModalMember.member_id}</strong> لا يتم حذفه نهائياً للحفاظ على سجلات الخدمة والافتقاد.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => handleUpdateStatus('Active')}
                className="btn"
                style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', justifyContent: 'flex-start' }}
              >
                <CheckCircle size={18} />
                <span>نشط (Active) - يشارك في الأنشطة والحضور</span>
              </button>

              <button
                onClick={() => handleUpdateStatus('Inactive')}
                className="btn"
                style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.3)', justifyContent: 'flex-start' }}
              >
                <AlertCircle size={18} />
                <span>غير نشط (Inactive) - منقطع أو غائب مؤقتاً</span>
              </button>

              <button
                onClick={() => handleUpdateStatus('Archived')}
                className="btn"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', justifyContent: 'flex-start' }}
              >
                <ShieldAlert size={18} />
                <span>مؤرشف (Archived) - انتقل لمرحلة أخرى أو سافر</span>
              </button>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setStatusModalMember(null)} className="btn btn-secondary" disabled={submitting}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
