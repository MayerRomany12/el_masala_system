import React, { useEffect, useState, useCallback } from 'react';
import { eventsApi } from '../api/events';
import { membersApi } from '../api/members';
import {
  Calendar,
  Compass,
  Plus,
  Search,
  RefreshCw,
  Edit,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  MapPin,
  AlertCircle,
  X,
  CreditCard,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
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

export const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);

  // Stats summary
  const [summaryStats, setSummaryStats] = useState({
    totalCount: 0,
    totalCollected: 0,
    totalRemaining: 0,
    activeCount: 0
  });

  // Event Modal (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'Trip',
    event_date: new Date().toISOString().split('T')[0],
    stage: 'ALL',
    fee: 150,
    location: '',
    description: '',
    status: 'Active'
  });

  // Participants & Payments Modal
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [partLoading, setPartLoading] = useState(false);
  const [partError, setPartError] = useState('');
  const [partSearch, setPartSearch] = useState('');

  // Registration Form in Modal
  const [regMemberSearch, setRegMemberSearch] = useState('');
  const [foundMembers, setFoundMembers] = useState([]);
  const [selectedRegMember, setSelectedRegMember] = useState(null);
  const [regAmountDue, setRegAmountDue] = useState(0);
  const [regAmountPaid, setRegAmountPaid] = useState(0);
  const [regNotes, setRegNotes] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Update Payment Modal / Row State
  const [editingPayment, setEditingPayment] = useState(null); // reg object
  const [payAmountPaid, setPayAmountPaid] = useState(0);
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Fetch events list
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.getEvents({
        search: searchTerm,
        event_type: selectedType,
        status: selectedStatus,
        page,
        limit: 50
      });
      if (res.success) {
        setEvents(res.data.items);

        // Calc metrics
        let collected = 0;
        let remaining = 0;
        let activeC = 0;
        res.data.items.forEach(e => {
          collected += (e.total_collected || 0);
          remaining += (e.total_remaining || 0);
          if (e.status === 'Active') activeC++;
        });
        setSummaryStats({
          totalCount: res.data.total,
          totalCollected: collected,
          totalRemaining: remaining,
          activeCount: activeC
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر تحميل قائمة الفعاليات والرحلات');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedType, selectedStatus, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Open Event Modal
  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setFormError('');
    setFormData({
      title: '',
      event_type: 'Trip',
      event_date: new Date().toISOString().split('T')[0],
      stage: 'ALL',
      fee: 150,
      location: '',
      description: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (evt) => {
    setEditingEvent(evt);
    setFormError('');
    setFormData({
      title: evt.title,
      event_type: evt.event_type,
      event_date: evt.event_date,
      stage: evt.stage,
      fee: evt.fee,
      location: evt.location || '',
      description: evt.description || '',
      status: evt.status
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      if (editingEvent) {
        await eventsApi.updateEvent(editingEvent.event_id, formData);
      } else {
        await eventsApi.createEvent(formData);
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'فشل حفظ بيانات الفعالية');
    } finally {
      setFormLoading(false);
    }
  };

  // Status Change
  const handleStatusChange = async (eventId, newStatus) => {
    try {
      await eventsApi.updateEventStatus(eventId, newStatus);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تغيير حالة الفعالية');
    }
  };

  // Open Participants Drawer / Modal
  const handleOpenParticipants = async (evt) => {
    setSelectedEvent(evt);
    setPartError('');
    setRegMemberSearch('');
    setSelectedRegMember(null);
    setFoundMembers([]);
    setRegAmountDue(evt.fee);
    setRegAmountPaid(0);
    setRegNotes('');
    fetchParticipants(evt.event_id);
  };

  const fetchParticipants = async (eventId, search = '') => {
    setPartLoading(true);
    try {
      const res = await eventsApi.getParticipants(eventId, { search });
      if (res.success) {
        setParticipants(res.data);
      }
    } catch (err) {
      setPartError(err.response?.data?.message || 'تعذر تحميل كشف المشتركين');
    } finally {
      setPartLoading(false);
    }
  };

  // Search Members for Registration
  const handleSearchMembersForReg = async (val) => {
    setRegMemberSearch(val);
    if (!val || val.trim().length < 2) {
      setFoundMembers([]);
      return;
    }
    try {
      const res = await membersApi.getMembers({ search: val, status: 'Active', limit: 5 });
      if (res.success) {
        setFoundMembers(res.data.items);
      }
    } catch (err) {
      setFoundMembers([]);
    }
  };

  // Register Member submit
  const handleRegisterMemberSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRegMember || !selectedEvent) return;
    setRegSubmitting(true);
    setPartError('');
    try {
      await eventsApi.registerMember(selectedEvent.event_id, {
        member_id: selectedRegMember.member_id,
        amount_due: parseFloat(regAmountDue),
        amount_paid: parseFloat(regAmountPaid),
        notes: regNotes
      });
      setSelectedRegMember(null);
      setRegMemberSearch('');
      setFoundMembers([]);
      setRegAmountPaid(0);
      setRegNotes('');
      fetchParticipants(selectedEvent.event_id);
      fetchEvents(); // Refresh event stats
    } catch (err) {
      setPartError(err.response?.data?.message || 'فشل تسجيل المخدوم في الفعالية');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Open Edit Payment Modal
  const handleOpenEditPayment = (reg) => {
    setEditingPayment(reg);
    setPayAmountPaid(reg.amount_paid);
    setPayNotes(reg.notes || '');
  };

  const handleUpdatePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!editingPayment || !selectedEvent) return;
    setPaySubmitting(true);
    try {
      await eventsApi.updatePayment(selectedEvent.event_id, editingPayment.registration_id, {
        amount_paid: parseFloat(payAmountPaid),
        notes: payNotes
      });
      setEditingPayment(null);
      fetchParticipants(selectedEvent.event_id);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تحديث المبلغ المدفوع');
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Compass size={28} style={{ color: '#fbbf24' }} />
            <span>إدارة الأنشطة والاجتماعات والرحلات</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            تسجيل الفعاليات والرحلات الخدمية، وتتبع اشتراكات الأطفال وسداد المبالغ المالية باحترافية
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleOpenCreateModal} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <Plus size={18} />
            <span>إنشاء نشاط / رحلة جديدة</span>
          </button>
          <button onClick={fetchEvents} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Compass size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي الأنشطة والرحلات</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>{summaryStats.totalCount}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>الإيرادات المحصلة (سداد)</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{summaryStats.totalCollected.toLocaleString()} جم</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(248, 113, 113, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>المتبقي غير المحصل</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>{summaryStats.totalRemaining.toLocaleString()} جم</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>الأنشطة النشطة حالياً</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>{summaryStats.activeCount}</strong>
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
            placeholder="بحث باسم النشاط، المكان، أو EVT-XXXX..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ flex: '0 1 180px' }}>
          <select
            className="form-input"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">كل الأنواع</option>
            <option value="Trip">رحلات 🚌</option>
            <option value="Meeting">اجتماعات أسبوعية ⛪</option>
            <option value="Event">أنشطة ومؤتمرات ✨</option>
          </select>
        </div>

        <div style={{ flex: '0 1 180px' }}>
          <select
            className="form-input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="Active">نشط (Active)</option>
            <option value="Completed">مكتمل (Completed)</option>
            <option value="Cancelled">ملغى (Cancelled)</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#fca5a5' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginLeft: '6px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Events Cards Grid */}
      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" />
          <div style={{ marginTop: '0.5rem' }}>جاري تحميل قائمة الفعاليات والرحلات...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          لا توجد فعاليات مطابقة للفلاتر الحالية. يمكنك إضافة رحلة أو اجتماع جديد.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {events.map((evt) => {
            const isTrip = evt.event_type === 'Trip';
            const isMeeting = evt.event_type === 'Meeting';
            const progress = evt.total_due > 0 ? Math.min(100, Math.round((evt.total_collected / evt.total_due) * 100)) : 100;

            return (
              <div
                key={evt.event_id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifySpace: 'space-between',
                  gap: '1rem',
                  border: evt.status === 'Active' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                  opacity: evt.status === 'Cancelled' ? 0.6 : 1
                }}
              >
                <div>
                  {/* Top Bar: Badge & EVT ID */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          background: isTrip ? 'rgba(251, 191, 36, 0.15)' : isMeeting ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: isTrip ? '#fbbf24' : isMeeting ? '#38bdf8' : '#a855f7',
                          border: `1px solid ${isTrip ? '#fbbf2440' : isMeeting ? '#38bdf840' : '#a855f740'}`
                        }}
                      >
                        {isTrip ? 'رحلة 🚌' : isMeeting ? 'اجتماع أسبوعي ⛪' : 'نشاط خاص ✨'}
                      </span>

                      <span
                        className="badge"
                        style={{
                          background: evt.status === 'Active' ? 'rgba(52, 211, 153, 0.15)' : evt.status === 'Completed' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: evt.status === 'Active' ? '#34d399' : evt.status === 'Completed' ? '#94a3b8' : '#f87171'
                        }}
                      >
                        {evt.status === 'Active' ? 'نشط' : evt.status === 'Completed' ? 'مكتمل' : 'ملغى'}
                      </span>
                    </div>

                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>
                      {evt.event_id}
                    </span>
                  </div>

                  {/* Title & Date */}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    {evt.title}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} style={{ color: '#38bdf8' }} />
                      <span>التاريخ: <strong style={{ color: '#f8fafc' }}>{evt.event_date}</strong></span>
                    </div>

                    {evt.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} style={{ color: '#fbbf24' }} />
                        <span>الوجهة: <strong style={{ color: '#f8fafc' }}>{evt.location}</strong></span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} style={{ color: '#a855f7' }} />
                      <span>المرحلة: <strong style={{ color: '#f8fafc' }}>{evt.stage}</strong></span>
                    </div>
                  </div>

                  {/* Financial Bar */}
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>رسوم الفعالية: <strong style={{ color: '#fbbf24' }}>{evt.fee} جم</strong></span>
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>{evt.participants_count} مشترك</span>
                    </div>

                    {evt.fee > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                          <span>محصل: {evt.total_collected} جم</span>
                          <span>متبقي: {evt.total_remaining} جم</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #34d399 0%, #38bdf8 100%)' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleOpenParticipants(evt)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem', gap: '4px' }}
                  >
                    <UserCheck size={15} />
                    <span>المشاركون والاشتراكات</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(evt)}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  >
                    <Edit size={15} />
                  </button>

                  {evt.status === 'Active' && (
                    <button
                      onClick={() => handleStatusChange(evt.event_id, 'Completed')}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#34d399' }}
                      title="تعليم كمكتمل"
                    >
                      <CheckCircle size={15} />
                    </button>
                  )}

                  {evt.status === 'Active' && (
                    <button
                      onClick={() => handleStatusChange(evt.event_id, 'Cancelled')}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#f87171' }}
                      title="إلغاء الفعالية"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create / Edit Event Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', background: '#1e293b', boxShadow: 'var(--shadow-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {editingEvent ? `تعديل فعالية: ${editingEvent.title}` : 'إنشاء نشاط / رحلة جديدة'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">اسم الفعالية / الرحلة *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: رحلة دير الأنبا بيشوي أو اجتماع الأحد"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">نوع الفعالية *</label>
                  <select
                    className="form-input"
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  >
                    <option value="Trip">رحلة 🚌</option>
                    <option value="Meeting">اجتماع أسبوعي ⛪</option>
                    <option value="Event">نشاط خاص / مؤتمر ✨</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ الفعالية *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">المرحلة المستهدفة *</label>
                  <select
                    className="form-input"
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  >
                    {STAGE_OPTIONS.map((stg) => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">الاشتراك الأساسي (جم) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="form-input"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">الوجهة / المكان (اختياري)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="مثال: وادي النطرون / قاعة الكنيسة"
                />
              </div>

              <div className="form-group">
                <label className="form-label">وصف الفعالية (اختياري)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ملاحظات أو برنامج الرحلة..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'جاري الحفظ...' : 'حفظ الفعالية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Participants & Payments Modal */}
      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', background: '#1e293b', boxShadow: 'var(--shadow-glow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={22} style={{ color: '#fbbf24' }} />
                  <span>كشف المشاركين والاشتراكات المالية: {selectedEvent.title}</span>
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                  الرمز: {selectedEvent.event_id} | رسوم الفعالية: {selectedEvent.fee} جم | التاريخ: {selectedEvent.event_date}
                </span>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {partError && (
              <div style={{ margin: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                {partError}
              </div>
            )}

            {/* Registration Form Bar */}
            {selectedEvent.status === 'Active' ? (
              <div style={{ padding: '1rem 1.25rem', background: 'rgba(56, 189, 248, 0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>
                  ➕ تسجيل طفل جديد في الفعالية:
                </div>

                <form onSubmit={handleRegisterMemberSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {/* Search member */}
                  <div style={{ flex: '1 1 220px', position: 'relative' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>ابحث بالاسم أو الرمز K-XXXX</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.85rem' }}
                      placeholder="اسم الطفل أو تليفونه..."
                      value={selectedRegMember ? `${selectedRegMember.full_name} (${selectedRegMember.member_id})` : regMemberSearch}
                      onChange={(e) => {
                        setSelectedRegMember(null);
                        handleSearchMembersForReg(e.target.value);
                      }}
                    />

                    {/* Member Dropdown */}
                    {foundMembers.length > 0 && !selectedRegMember && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '8px', zIndex: 50, maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                        {foundMembers.map((m) => (
                          <div
                            key={m.member_id}
                            onClick={() => {
                              setSelectedRegMember(m);
                              setFoundMembers([]);
                            }}
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}
                          >
                            <strong>{m.full_name}</strong> <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>({m.member_id})</span> — {m.stage}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amount due */}
                  <div style={{ width: '110px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>المستحق (جم)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="form-input"
                      style={{ fontSize: '0.85rem' }}
                      value={regAmountDue}
                      onChange={(e) => setRegAmountDue(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  {/* Amount paid */}
                  <div style={{ width: '110px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>المدفوع الان</label>
                    <input
                      type="number"
                      min="0"
                      max={regAmountDue}
                      step="0.5"
                      className="form-input"
                      style={{ fontSize: '0.85rem' }}
                      value={regAmountPaid}
                      onChange={(e) => setRegAmountPaid(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!selectedRegMember || regSubmitting}
                    style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                  >
                    {regSubmitting ? 'جاري التسجيل...' : 'إضافة مشترك'}
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', fontSize: '0.82rem' }}>
                ℹ️ هذه الفعالية ({selectedEvent.status === 'Completed' ? 'مكتملة' : 'ملغاة'}) — التسجيل مغلق حالياً.
              </div>
            )}

            {/* Participants Search & Table */}
            <div style={{ padding: '1rem 1.25rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  قائمة المشاركين ({participants.length} طفل)
                </span>

                <input
                  type="text"
                  className="form-input"
                  style={{ width: '220px', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                  placeholder="فلترة في المشاركين..."
                  value={partSearch}
                  onChange={(e) => {
                    setPartSearch(e.target.value);
                    fetchParticipants(selectedEvent.event_id, e.target.value);
                  }}
                />
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>رمز العضوية</th>
                      <th>اسم الطفل المشترك</th>
                      <th>المرحلة</th>
                      <th>المستحق</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>حالة الدفع</th>
                      <th style={{ textAlign: 'center' }}>إجراء السداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partLoading ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>جاري تحميل كشف المشاركين...</td>
                      </tr>
                    ) : participants.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          لا يوجد مشاركون مسجلون في هذه الفعالية حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => {
                        const isPaid = p.payment_status === 'Paid';
                        const isPartial = p.payment_status === 'Partial';

                        return (
                          <tr key={p.registration_id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                                {p.member_id}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {p.member_name}
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>{p.member_stage}</td>
                            <td style={{ fontWeight: 700 }}>{p.amount_due} جم</td>
                            <td style={{ fontWeight: 700, color: '#34d399' }}>{p.amount_paid} جم</td>
                            <td style={{ fontWeight: 700, color: p.remaining_amount > 0 ? '#f87171' : '#94a3b8' }}>
                              {p.remaining_amount} جم
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: isPaid ? 'rgba(52, 211, 153, 0.15)' : isPartial ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isPaid ? '#34d399' : isPartial ? '#fbbf24' : '#f87171'
                                }}
                              >
                                {isPaid ? 'مدفوع بالكامل 🟢' : isPartial ? 'مدفوع جزئياً 🟡' : 'غير مدفوع 🔴'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => handleOpenEditPayment(p)}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                              >
                                تحديث السداد 💳
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Payment Mini Modal */}
      {editingPayment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: '#1e293b', boxShadow: 'var(--shadow-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                تحديث سداد: {editingPayment.member_name}
              </h4>
              <button onClick={() => setEditingPayment(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              المبلغ المستحق المطلوب: <strong style={{ color: '#fbbf24' }}>{editingPayment.amount_due} جم</strong>
            </div>

            <form onSubmit={handleUpdatePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">المبلغ الإجمالي المدفوع حتى الآن (جم) *</label>
                <input
                  type="number"
                  min="0"
                  max={editingPayment.amount_due}
                  step="0.5"
                  className="form-input"
                  value={payAmountPaid}
                  onChange={(e) => setPayAmountPaid(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات السداد (اختياري)</label>
                <input
                  type="text"
                  className="form-input"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="مثال: تم تحصيل 50 جم يدوياً بواسطة الخادم"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditingPayment(null)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={paySubmitting}>
                  {paySubmitting ? 'جاري الحفظ...' : 'تأكيد السداد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
