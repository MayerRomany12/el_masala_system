import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { membersApi } from '../api/members';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { normalizePhone, getWaUrl, isValidFullName, isValidEgyptianMobile } from '../utils/phone';
import { getPhotoUrl } from '../utils/photo';
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
  QrCode,
  Copy,
  Check,
  Printer
} from 'lucide-react';

// ─── Modal after newly creating a member with QR code & download button ──────
const CreatedMemberQRModal = ({ member, onClose }) => {
  const qrCanvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (!member?.member_id) return;
    navigator.clipboard.writeText(member.member_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

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
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 576, 676);

    // 3. Header Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Cairo, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('كنيسة مارجرجس والأنبا شنودة بالكرور', 300, 55);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Cairo, system-ui, sans-serif';
    ctx.fillText('بطاقة مخدوم - خدمة مدارس الأحد ⛪', 300, 88);

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
    if (!member) return;
    const canvas = document.createElement('canvas');
    const qrSize = 512;
    canvas.width = qrSize;
    canvas.height = qrSize;
    const qrValue = member.qr_token || member.member_id;

    QRCode.toCanvas(canvas, qrValue, {
      width: qrSize,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, (err) => {
      if (err) {
        alert('تعذر إنشاء صورة الـ QR');
        return;
      }
      const safeName = (member.full_name || 'member').replace(/\s+/g, '_');
      const link = document.createElement('a');
      link.download = `QR_${safeName}_${member.member_id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
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

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(56, 189, 248, 0.15)',
              padding: '0.25rem 0.6rem 0.25rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#38bdf8'
              }}>
                {member.member_id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                title="نسخ كود المخدوم"
                style={{
                  background: copied ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                  border: copied ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '6px',
                  color: copied ? '#34d399' : '#38bdf8',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? (
                  <>
                    <Check size={13} />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>

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
            onClick={downloadPureQR}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              justifyContent: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
            }}
          >
            <Download size={18} />
            <span>تحميل رمز الـ QR منفصلاً (صورة PNG نقية) 📥</span>
          </button>

          <button
            onClick={downloadQRCard}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}
          >
            <QrCode size={16} />
            <span>تحميل في كارت مطبوع كامل (اختياري)</span>
          </button>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', justifyContent: 'center', marginTop: '0.25rem' }}
          >
            إغلاق ومتابعة
          </button>
        </div>
      </div>
    </div>
  );
};


// ——— No more hardcoded STAGE_OPTIONS — classes come from API ———

export const MemberManagement = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Data States
  const [members, setMembers] = useState([]);
  const [classes, setClasses] = useState([]);  // الفصول الديناميكية من API
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
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [areasList, setAreasList] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal States (Compact dialogs only)
  const [statusModalMember, setStatusModalMember] = useState(null);
  const [createdMember, setCreatedMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // جلب الفصول والمناطق الديناميكية من API
  useEffect(() => {
    apiClient.get('/classes?limit=200')
      .then(res => {
        const data = res?.data?.data?.items || res?.data?.items || [];
        setClasses(data);
      })
      .catch(() => setClasses([]));

    membersApi.getDistinctAreas()
      .then(res => {
        setAreasList(res?.data || res || []);
      })
      .catch(() => setAreasList([]));
  }, []);

  const handlePrintMember = async (memberId) => {
    try {
      const res = await apiClient.get(`/reports/member/${memberId}/print-profile`);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(res.data);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 600);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر استخراج استمارة المخدوم للطباعة');
    }
  };

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, statsRes] = await Promise.all([
        membersApi.getMembers({
          search: searchTerm || undefined,
          class_id: selectedClassId || undefined,
          area: selectedArea || undefined,
          status: selectedStatus || undefined,
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
  }, [searchTerm, selectedClassId, selectedArea, selectedStatus, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigate to Create Member Page
  const handleOpenCreate = () => {
    navigate('/members/new');
  };

  // Navigate to Edit Member Page
  const handleOpenEdit = (member) => {
    navigate(`/members/${member.member_id}/edit`);
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

      {/* 2.5 Active vs Archived Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setSelectedStatus(''); setPage(1); }}
          className={`btn ${selectedStatus !== 'Archived' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.55rem 1.2rem', fontSize: '0.9rem', borderRadius: '10px', gap: '8px' }}
        >
          <Users size={18} />
          <span>قائمة المخدومين المنشطين</span>
        </button>

        <button
          onClick={() => { setSelectedStatus('Archived'); setPage(1); }}
          className={`btn ${selectedStatus === 'Archived' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            padding: '0.55rem 1.2rem',
            fontSize: '0.9rem',
            borderRadius: '10px',
            gap: '8px',
            background: selectedStatus === 'Archived' ? 'rgba(239, 68, 68, 0.25)' : undefined,
            borderColor: selectedStatus === 'Archived' ? '#f87171' : undefined,
            color: selectedStatus === 'Archived' ? '#fca5a5' : undefined
          }}
        >
          <Archive size={18} />
          <span>أرشيف المخدومين والمستبعدين ({stats.inactive_members || 0})</span>
        </button>
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

        {/* Class Filter - Dynamic from API */}
        <div style={{ flex: '0 1 200px' }}>
          <select
            className="form-input"
            value={selectedClassId}
            onChange={(e) => { setSelectedClassId(e.target.value); setPage(1); }}
          >
            <option value="">كل الفصول الخدمية</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>{cls.name}</option>
            ))}
          </select>
        </div>

        {/* Area Filter */}
        <div style={{ flex: '0 1 180px' }}>
          <select
            className="form-input"
            value={selectedArea}
            onChange={(e) => { setSelectedArea(e.target.value); setPage(1); }}
          >
            <option value="">كل المناطق السكنية</option>
            {areasList.map((a) => (
              <option key={a} value={a}>{a}</option>
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
                            <img src={getPhotoUrl(member.photo_url)} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 'bold' }}>{member.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{member.full_name}</span>
                            {member.area && (
                              <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                                {member.area}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            الجنس: {member.gender} {member.email ? `• ✉️ ${member.email}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {member.active_classes && member.active_classes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {member.active_classes.map((ac) => (
                            <span
                              key={ac.class_id}
                              className="badge"
                              style={{
                                fontSize: '0.78rem',
                                padding: '0.2rem 0.5rem',
                                background: ac.group_type === 'Summer' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(122, 8, 29, 0.25)',
                                color: ac.group_type === 'Summer' ? '#fbbf24' : 'var(--color-gold-light)',
                                border: ac.group_type === 'Summer' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(212, 175, 55, 0.35)',
                                maxWidth: 'fit-content'
                              }}
                            >
                              {ac.class_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{member.stage || 'عام'}</div>
                          {member.group_name && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{member.group_name}</div>
                          )}
                        </div>
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
                        {/* Always available QR Card View / Download Button */}
                        <button
                          onClick={async () => {
                            try {
                              const cardRes = await membersApi.getMemberCard(member.member_id);
                              if (cardRes && cardRes.data) {
                                setCreatedMember(cardRes.data);
                              } else {
                                setCreatedMember(member);
                              }
                            } catch (e) {
                              setCreatedMember(member);
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#38bdf8' }}
                          title="عرض وتحميل رمز الـ QR والبطاقة في أي وقت"
                        >
                          <QrCode size={15} />
                        </button>

                        <button
                          onClick={() => navigate(`/members/${member.member_id}`)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="عرض الملف الكامل"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => handlePrintMember(member.member_id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#60a5fa' }}
                          title="طباعة استمارة المخدوم الشاملة (PDF)"
                        >
                          <Printer size={15} />
                        </button>

                        {/* Unarchive Quick Button if archived */}
                        {member.is_archived && hasPermission('members:write') && (
                          <button
                            onClick={async () => {
                              try {
                                await apiClient.patch(`/members/${member.member_id}/archive`, null, { params: { is_archived: false } });
                                fetchData();
                              } catch (err) { alert(err.response?.data?.message || 'فشل إلغاء الأرشفة'); }
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#34d399' }}
                            title="إلغاء الأرشفة"
                          >
                            <Archive size={15} />
                          </button>
                        )}

                        {/* Status Change Button */}
                        {hasPermission('members:write') && !member.is_archived && (
                          <button
                            onClick={() => setStatusModalMember(member)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#fb923c' }}
                            title="تغيير الحالة / أرشفة"
                          >
                            <ShieldAlert size={15} />
                          </button>
                        )}

                        {/* Edit Button */}
                        {hasPermission('members:write') && (
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                            title="تعديل البيانات"
                          >
                            <Edit size={15} />
                          </button>
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

      {/* 5. Pagination */}
      {totalItems > 20 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 0'
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            السابق
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            صفحة {page} من {Math.ceil(totalItems / 20)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(totalItems / 20)}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            التالي
          </button>
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
