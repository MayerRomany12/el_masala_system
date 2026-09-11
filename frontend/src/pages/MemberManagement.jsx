import React, { useEffect, useState, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { membersApi } from '../api/members';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { normalizePhone, getWaUrl, isValidFullName, isValidEgyptianMobile } from '../utils/phone';
import { WhatsAppButton } from '../components/WhatsAppButton';
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
  FileText,
  Camera,
  Archive,
  Download,
  QrCode
} from 'lucide-react';

// ─── Modal after newly creating a member with QR code & download button ──────
const CreatedMemberQRModal = ({ member, onClose }) => {
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    if (qrCanvasRef.current && member) {
      const qrValue = member.qr_token || member.member_id;
      QRCode.toCanvas(
        qrCanvasRef.current,
        qrValue,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        },
        (err) => {
          if (err) console.error('فشل إنشاء رمز الـ QR:', err);
        }
      );
    }
  }, [member]);

  if (!member) return null;

  const downloadQRCard = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 700;

    // 1. Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 600, 700);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 600, 700);

    // 2. Card Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 576, 676);

    // 3. Header Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px Cairo, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('كنيسة العذراء مريم والأنبا بولا بالمسلة', 300, 55);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Cairo, system-ui, sans-serif';
    ctx.fillText('بطاقة مخدوم - نظام الحضور الذكي ⛪', 300, 88);

    // 4. Divider Line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 105);
    ctx.lineTo(560, 105);
    ctx.stroke();

    // 5. Member Full Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Cairo, system-ui, sans-serif';
    ctx.fillText(member.full_name || '', 300, 155);

    // 6. Stage
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Cairo, system-ui, sans-serif';
    ctx.fillText(member.stage || '', 300, 195);

    // 7. Member ID Badge Box
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(150, 215, 300, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(150, 215, 300, 48);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`ID: ${member.member_id || ''}`, 300, 248);

    // 8. QR Code Image from Canvas
    if (qrCanvasRef.current) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(175, 285, 250, 250);
      ctx.drawImage(qrCanvasRef.current, 185, 295, 230, 230);
    }

    // 9. Phone Number
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Cairo, system-ui, sans-serif';
    ctx.fillText(`تليفون ولي الأمر: ${member.phone || ''}`, 300, 580);

    // 10. Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Cairo, system-ui, sans-serif';
    ctx.fillText('رمز QR آمن ومشفر لمسح الحضور التلقائي', 300, 640);

    // Trigger Download
    const link = document.createElement('a');
    const safeName = (member.full_name || 'member').replace(/\s+/g, '_');
    link.download = `QR_Card_${member.member_id}_${safeName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadPureQR = () => {
    if (!qrCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `QR_${member.member_id}.png`;
    link.href = qrCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div className="glass-card animate-scale-in" style={{
        width: '100%',
        maxWidth: '480px',
        background: '#1e293b',
        border: '1.5px solid #38bdf8',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        textAlign: 'center',
        padding: '1.75rem 1.5rem'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(52, 211, 153, 0.15)',
          border: '2px solid #34d399',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#34d399', margin: '0 auto 1rem auto'
        }}>
          <CheckCircle size={32} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.3rem' }}>
          🎉 تم تسجيل المخدوم بنجاح!
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
          تم توليد الكود الفريد ورمز الـ QR الخاص بالحضور الذكي
        </p>

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
            {member.full_name}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '1rem',
              fontWeight: 900,
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.15)',
              padding: '0.25rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              {member.member_id}
            </span>

            <span style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#a855f7',
              background: 'rgba(168, 85, 247, 0.15)',
              padding: '0.25rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              {member.stage}
            </span>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            marginTop: '0.5rem'
          }}>
            <canvas ref={qrCanvasRef} style={{ width: '180px', height: '180px', display: 'block' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            رمز الـ QR المخصص لمسح الحضور الإلكتروني
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={downloadQRCard}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', justifyContent: 'center', gap: '8px' }}
          >
            <Download size={18} />
            <span>تحميل بطاقة الـ QR كاملة (PNG) 🖼️</span>
          </button>

          <button
            onClick={downloadPureQR}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', justifyContent: 'center', gap: '8px' }}
          >
            <QrCode size={16} />
            <span>تحميل رمز الـ QR فقط (صورة PNG)</span>
          </button>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center', marginTop: '0.25rem' }}
          >
            إغلاق ومتابعة التسجيل
          </button>
        </div>
      </div>
    </div>
  );
};


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
  const [createdMember, setCreatedMember] = useState(null);

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

    // 1. Full name validation (at least 3 words, no numbers)
    if (!isValidFullName(formData.full_name)) {
      setModalError('اسم الطفل المخدوم يجب أن يكون ثلاثياً أو رباعياً على الأقل بدون أرقام (مثال: مارك فادي نبيل)');
      return;
    }

    // 2. Egyptian phone validation
    if (!isValidEgyptianMobile(formData.phone)) {
      setModalError('رقم تليفون ولي الأمر يجب أن يكون رقم محمول مصري صالح مكون من 11 رقم يبدأ بـ (010 أو 011 أو 012 أو 015)');
      return;
    }

    // 3. Optional WhatsApp validation
    if (formData.whatsapp_phone && !isValidEgyptianMobile(formData.whatsapp_phone)) {
      setModalError('رقم الواتساب غير صالح. يرجى إدخال رقم محمول مصري مكون من 11 رقم يبدأ بـ (010 أو 011 أو 012 أو 015)');
      return;
    }

    setSubmitting(true);

    const payload = {
      ...formData,
      full_name: formData.full_name.trim(),
      date_of_birth: formData.date_of_birth ? formData.date_of_birth : null,
      group_name: formData.group_name?.trim() || null,
      father_of_confession: formData.father_of_confession?.trim() || null,
      address: formData.address?.trim() || null,
      notes: formData.notes?.trim() || null,
      phone: normalizePhone(formData.phone),
      whatsapp_phone: formData.whatsapp_phone ? normalizePhone(formData.whatsapp_phone) : normalizePhone(formData.phone)
    };

    try {
      if (editingMember) {
        await membersApi.updateMember(editingMember.member_id, payload);
        setShowAddModal(false);
        fetchData();
      } else {
        const res = await membersApi.createMember(payload);
        setShowAddModal(false);
        fetchData();
        const createdData = res?.data || res;
        if (createdData && (createdData.member_id || createdData.id)) {
          setCreatedMember(createdData);
        }
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'فشلت عملية حفظ المخدوم ببيانات السيرفر. يرجى مراجعة التليفون أو المحاولة مجدداً.');
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#334155',
                          border: '1px solid #38bdf8',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 'bold' }}>{member.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{member.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الجنس: {member.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{member.stage}</div>
                      {member.group_name && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>فصل: {member.group_name}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <a
                          href={`tel:${member.phone}`}
                          style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Phone size={14} />
                          <span>{member.phone}</span>
                        </a>
                        <WhatsAppButton
                          phone={member.whatsapp_phone || member.phone}
                          memberName={member.full_name}
                          memberId={member.member_id}
                          template="card"
                          variant="icon"
                        />
                      </div>
                    </td>
                    <td>
                      {member.is_archived ? (
                        <span className="badge badge-danger">مؤرشف</span>
                      ) : (
                        getStatusBadge(member.status)
                      )}
                    </td>
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
                              title="تعديل البيانات والصورة"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => setStatusModalMember(member)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#fb923c' }}
                              title="تغيير الحالة والأرشفة"
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
                
                {/* Photo Upload Section for Existing Member */}
                {editingMember && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '10px', background: '#334155',
                        border: '1px solid #38bdf8', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {formData.photo_url ? (
                          <img src={formData.photo_url} alt="صورة المخدوم" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Camera size={24} style={{ color: '#38bdf8' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>صورة المخدوم الحالية</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>صورة شخصية واضحة للتعرف البصري</div>
                      </div>
                    </div>

                    <label className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', cursor: 'pointer', gap: '6px' }}>
                      <span>تغيير الصورة 🖼️</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const data = new FormData();
                            data.append('file', file);
                            const res = await apiClient.post(`/members/${editingMember.member_id}/photo`, data);
                            if (res.data && res.data.data) {
                              setFormData((prev) => ({ ...prev, photo_url: res.data.data.photo_url }));
                              alert('تم رفع صورة الطفل بنجاح');
                            }
                          } catch (err) {
                            alert(err.response?.data?.message || 'فشل رفع الصورة');
                          }
                        }}
                      />
                    </label>
                  </div>
                )}

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

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                {statusModalMember.is_archived ? (
                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await apiClient.patch(`/members/${statusModalMember.member_id}/archive`, null, { params: { is_archived: false } });
                        setStatusModalMember(null);
                        fetchData();
                      } catch (err) { alert(err.response?.data?.message || 'فشل إلغاء الأرشفة'); }
                      finally { setSubmitting(false); }
                    }}
                    className="btn"
                    style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', width: '100%', justifyContent: 'flex-start' }}
                  >
                    <Archive size={18} />
                    <span>إلغاء الأرشفة (Unarchive) وإعادة الملف للمنشطين</span>
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await apiClient.patch(`/members/${statusModalMember.member_id}/archive`, null, { params: { is_archived: true } });
                        setStatusModalMember(null);
                        fetchData();
                      } catch (err) { alert(err.response?.data?.message || 'فشل أرشفة المخدوم'); }
                      finally { setSubmitting(false); }
                    }}
                    className="btn"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', width: '100%', justifyContent: 'flex-start' }}
                  >
                    <Archive size={18} />
                    <span>أرشفة الملف (Archive) - الاحتفاظ بالبيانات وإخفاؤه من الحضور الجديد</span>
                  </button>
                )}
              </div>
            </div>


            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setStatusModalMember(null)} className="btn btn-secondary" disabled={submitting}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Newly Created Member QR Modal */}
      {createdMember && (
        <CreatedMemberQRModal
          member={createdMember}
          onClose={() => setCreatedMember(null)}
        />
      )}

    </div>
  );
};
