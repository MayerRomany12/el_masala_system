import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { membersApi } from '../api/members';
import { apiClient } from '../api/client';
import { getPhotoUrl } from '../utils/photo';
import { getWaUrl, getGmailUrl, getMapsUrl, getWaDigits } from '../utils/phone';
import {
  ArrowRight,
  Edit,
  Phone,
  MessageSquare,
  Calendar,
  Heart,
  MapPin,
  FileText,
  Sparkles,
  QrCode,
  Download,
  Copy,
  Check,
  User,
  Shield,
  Layers,
  Printer,
  TrendingUp,
  CheckCircle,
  XCircle,
  Flame,
  Award,
  Mail,
  Home,
  ExternalLink
} from 'lucide-react';

export const MemberProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [member, setMember] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);

  const qrCanvasRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      membersApi.getMemberById(id),
      membersApi.getMemberAttendanceHistory(id)
    ])
      .then(([memberRes, historyRes]) => {
        const memberData = memberRes.data || memberRes;
        const historyData = historyRes.data || historyRes;
        setMember(memberData);
        setHistory(historyData);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'تعذر تحميل بيانات المخدوم');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (member && qrCanvasRef.current) {
      const qrValue = member.qr_token || member.member_id;
      QRCode.toCanvas(
        qrCanvasRef.current,
        qrValue,
        {
          width: 180,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        },
        (err) => {
          if (err) console.error('فشل إنشاء رمز QR:', err);
        }
      );
    }
  }, [member]);

  const handleCopyId = () => {
    if (!member?.member_id) return;
    navigator.clipboard.writeText(member.member_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintComprehensiveProfile = async () => {
    setPrinting(true);
    try {
      const res = await apiClient.get(`/reports/member/${id}/print-profile`);
      const htmlContent = res.data;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 600);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر استخراج استمارة الطباعة الشاملة للمخدوم');
    } finally {
      setPrinting(false);
    }
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

  const downloadQRCard = () => {
    if (!member) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 700;

    // Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 600, 700);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 600, 700);

    // Card Border
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 576, 676);

    // Header Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px Cairo, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('كنيسة مارجرجس والأنبا شنودة بالكرور', 300, 55);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px Cairo, system-ui, sans-serif';
    ctx.fillText('بطاقة مخدوم - خدمة مدارس الأحد ⛪', 300, 88);

    // Divider Line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 105);
    ctx.lineTo(560, 105);
    ctx.stroke();

    // Member Full Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Cairo, system-ui, sans-serif';
    ctx.fillText(member.full_name || '', 300, 155);

    // Stage & Class
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Cairo, system-ui, sans-serif';
    ctx.fillText(member.stage || member.group_name || '', 300, 195);

    // Member ID Badge Box
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(150, 215, 300, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(150, 215, 300, 48);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px monospace, system-ui';
    ctx.fillText(member.member_id || '', 300, 248);

    // QR Image
    if (qrCanvasRef.current) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(175, 285, 250, 250);
      ctx.drawImage(qrCanvasRef.current, 185, 295, 230, 230);
    }

    // Phone
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Cairo, system-ui, sans-serif';
    ctx.fillText(`هاتف ولي الأمر: ${member.phone || 'غير مسجل'}`, 300, 575);

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Cairo, system-ui, sans-serif';
    ctx.fillText('نظام المسلة الكنسي لإدارة المخدومين والافتقاد', 300, 640);

    const link = document.createElement('a');
    link.download = `بطاقة_${member.full_name.replace(/\s+/g, '_')}_${member.member_id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>جاري استخراج السجل الشامل للمخدوم...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>تعذر العثور على المخدوم</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'المعرف غير صالح أو تم نقله'}</p>
          <button onClick={() => navigate('/members')} className="btn btn-primary">
            العودة لقائمة المخدومين
          </button>
        </div>
      </div>
    );
  }

  const attendanceRate = history?.attendance_rate ?? 0;
  const currentStreak = history?.current_streak ?? 0;
  const activeClasses = history?.active_classes || (member.active_classes || []);

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <ArrowRight size={16} />
          <span>رجوع</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {hasPermission('reports:export') && (
            <button
              onClick={handlePrintComprehensiveProfile}
              disabled={printing}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
              }}
            >
              <Printer size={17} />
              <span>{printing ? 'جاري التجهيز للطباعة...' : 'طباعة استمارة المخدوم الشاملة (PDF)'}</span>
            </button>
          )}

          {hasPermission('members:write') && (
            <Link
              to={`/members/${id}/edit`}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Edit size={16} />
              <span>تعديل البيانات</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Avatar Frame */}
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: '3px solid var(--color-gold, #f59e0b)',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {member.photo_url ? (
                <img
                  src={getPhotoUrl(member.photo_url)}
                  alt={member.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '2.2rem', color: 'var(--color-gold)', fontWeight: 800 }}>
                  {member.full_name.charAt(0)}
                </span>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {member.full_name}
                </h1>
                <span className={`badge ${member.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                  {member.status === 'Active' ? 'نشط بالخدمة' : member.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <span
                  onClick={handleCopyId}
                  title="انقر لنسخ المعرف"
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.15)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {copied ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                  <span>{member.member_id}</span>
                </span>

                <span style={{ color: 'var(--text-muted)' }}>
                  المرحلة: <strong style={{ color: 'var(--text-main)' }}>{member.stage || 'عام'}</strong>
                </span>

                {member.area && (
                  <span style={{
                    color: '#a855f7',
                    background: 'rgba(168, 85, 247, 0.12)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Home size={13} />
                    <span>منطقة: {member.area}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Communication Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                className="btn btn-secondary"
                style={{ fontSize: '0.84rem', gap: '0.4rem' }}
                title="اتصال هاتفي بولي الأمر"
              >
                <Phone size={15} />
                <span>اتصال بولي الأمر</span>
              </a>
            )}

            {(member.member_phone) && (
              <a
                href={`tel:${member.member_phone}`}
                className="btn btn-secondary"
                style={{ fontSize: '0.84rem', gap: '0.4rem' }}
                title="اتصال هاتفي بالمخدوم"
              >
                <Phone size={15} />
                <span>اتصال بالمخدوم</span>
              </a>
            )}

            {(member.whatsapp_phone || member.phone || member.member_phone) && (
              <a
                href={getWaUrl(member.whatsapp_phone || member.phone || member.member_phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.84rem',
                  gap: '0.4rem',
                  color: 'var(--color-success)',
                  borderColor: 'rgba(34, 197, 94, 0.3)'
                }}
                title="محادثة واتساب"
              >
                <MessageSquare size={15} />
                <span>واتساب 💬</span>
              </a>
            )}

            {member.email && (
              <a
                href={getGmailUrl(member.email, `متابعة من كنيسة الشهيد مارجرجس والأنبا شنودة بالكرور`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.84rem',
                  gap: '0.4rem',
                  color: '#f87171',
                  borderColor: 'rgba(239, 68, 68, 0.3)'
                }}
                title="إرسال بريد إلكتروني عبر Gmail مباشرة"
              >
                <Mail size={15} />
                <span>جيميل (Gmail) ✉️</span>
              </a>
            )}

            {(member.location_url || member.area) && (
              <a
                href={getMapsUrl(member.location_url, member.area)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.84rem',
                  gap: '0.4rem',
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.3)'
                }}
                title="فتح موقع السكن على Google Maps مباشرة"
              >
                <MapPin size={15} />
                <span>Google Maps 🗺️</span>
              </a>
            )}

            <button
              onClick={downloadPureQR}
              className="btn btn-secondary"
              style={{ fontSize: '0.84rem', gap: '0.4rem', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
              title="تحميل رمز الـ QR منفصلاً كصورة PNG نقية بدون كارت"
            >
              <Download size={15} />
              <span>تحميل QR (PNG) 📷</span>
            </button>
          </div>
        </div>

        {/* Classes Enrolled In */}
        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={15} />
            <span>الفصول والمجموعات المسكن بها:</span>
          </span>
          {activeClasses && activeClasses.length > 0 ? (
            activeClasses.map((cls, idx) => (
              <span
                key={idx}
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#93c5fd',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '14px',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                {typeof cls === 'object' ? (cls.class_name || cls.name || cls.class_id) : String(cls || '')}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>غير مسكن بفصل حالياً</span>
          )}
        </div>
      </div>

      {/* KPI Stats Highlights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Attendance Rate */}
        <div className="glass-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: attendanceRate >= 75 ? 'rgba(34, 197, 94, 0.15)' : attendanceRate >= 50 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `2px solid ${attendanceRate >= 75 ? '#22c55e' : attendanceRate >= 50 ? '#eab308' : '#ef4444'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: attendanceRate >= 75 ? '#22c55e' : attendanceRate >= 50 ? '#eab308' : '#ef4444',
            fontWeight: 900,
            fontSize: '0.9rem'
          }}>
            {attendanceRate}%
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>نسبة الحضور التراكمية</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {attendanceRate >= 75 ? 'ممتاز ومواظب 🌟' : attendanceRate >= 50 ? 'متوسط ⚠️' : 'غياب متكرر 🚨'}
            </div>
          </div>
        </div>

        {/* Present Sessions */}
        <div className="glass-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>مرات الحضور</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>{history?.present_count ?? 0} جلسة</div>
          </div>
        </div>

        {/* Absent Sessions */}
        <div className="glass-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>مرات الغياب</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{history?.absent_count ?? 0} جلسة</div>
          </div>
        </div>

        {/* Streak */}
        <div className="glass-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>الاستمرارية المتتالية</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
              {currentStreak > 0 ? `${currentStreak} جلسات متواصلة 🔥` : 'لا يوجد استمرارية حالياً'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Graphical Timeline & Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Left Column: Personal Data & Contacts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Personal Info */}
          <div className="glass-card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingBottom: '0.65rem',
              marginBottom: '0.85rem',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--color-gold)',
              fontSize: '0.95rem',
              fontWeight: 700
            }}>
              <User size={16} />
              <span>البيانات الشخصية والكنسية</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>النوع (الجنس):</span>
                <span style={{ fontWeight: 600 }}>{member.gender || 'ذكر'}</span>
              </div>

              {member.email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Mail size={15} /> البريد / Gmail:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#60a5fa', dir: 'ltr' }}>{member.email}</span>
                    <a
                      href={getGmailUrl(member.email, `متابعة من كنيسة الشهيد مارجرجس والأنبا شنودة`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon"
                      style={{ padding: '3px 6px', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                      title="فتح Gmail مباشرة"
                    >
                      <Mail size={12} />
                      <span>Gmail</span>
                    </a>
                  </div>
                </div>
              )}

              {member.area && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={15} /> المنطقة السكنية:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: '#c084fc' }}>{member.area}</span>
                    <a
                      href={getMapsUrl(member.location_url, member.area)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon"
                      style={{ padding: '3px 6px', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                      title="عرض المنطقة على Google Maps"
                    >
                      <MapPin size={12} />
                      <span>خرائط</span>
                    </a>
                  </div>
                </div>
              )}

              {member.location_url && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={15} color="#38bdf8" /> موقع Google Maps:
                  </span>
                  <a
                    href={getMapsUrl(member.location_url, member.area)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline', fontSize: '0.84rem' }}
                  >
                    <span>فتح الموقع 🗺️</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {member.address && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>العنوان التفصيلي:</span>
                  <span style={{ fontWeight: 600 }}>{member.address}</span>
                </div>
              )}

              {member.date_of_birth && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={15} /> تاريخ الميلاد:
                  </span>
                  <span style={{ fontWeight: 600 }}>{member.date_of_birth}</span>
                </div>
              )}

              {member.father_of_confession && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Heart size={15} /> أب الاعتراف:
                  </span>
                  <span style={{ fontWeight: 600 }}>{member.father_of_confession}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="glass-card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingBottom: '0.65rem',
              marginBottom: '0.85rem',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--color-primary-light)',
              fontSize: '0.95rem',
              fontWeight: 700
            }}>
              <Phone size={16} />
              <span>أرقام الهواتف والتواصل المباشر</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {(!member.whatsapp_phone || getWaDigits(member.whatsapp_phone) === getWaDigits(member.phone))
                    ? 'هاتف وواتساب ولي الأمر:'
                    : 'هاتف ولي الأمر:'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', dir: 'ltr' }}>{member.phone}</span>
                  <a href={`tel:${member.phone}`} className="btn-icon" style={{ padding: '4px', color: '#38bdf8' }} title="اتصال هاتفي">
                    <Phone size={14} />
                  </a>
                  <a href={getWaUrl(member.phone)} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '4px', color: '#22c55e' }} title="محادثة واتساب">
                    <MessageSquare size={14} />
                  </a>
                </div>
              </div>

              {member.secondary_phone && getWaDigits(member.secondary_phone) !== getWaDigits(member.phone) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>هاتف إضافي:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', dir: 'ltr' }}>{member.secondary_phone}</span>
                    <a href={`tel:${member.secondary_phone}`} className="btn-icon" style={{ padding: '4px', color: '#38bdf8' }} title="اتصال هاتفي">
                      <Phone size={14} />
                    </a>
                    <a href={getWaUrl(member.secondary_phone)} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '4px', color: '#22c55e' }} title="محادثة واتساب">
                      <MessageSquare size={14} />
                    </a>
                  </div>
                </div>
              )}

              {member.member_phone && getWaDigits(member.member_phone) !== getWaDigits(member.phone) && getWaDigits(member.member_phone) !== getWaDigits(member.secondary_phone) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>هاتف المخدوم نفسه:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', dir: 'ltr' }}>{member.member_phone}</span>
                    <a href={`tel:${member.member_phone}`} className="btn-icon" style={{ padding: '4px', color: '#38bdf8' }} title="اتصال هاتفي">
                      <Phone size={14} />
                    </a>
                    <a href={getWaUrl(member.member_phone)} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '4px', color: '#22c55e' }} title="محادثة واتساب">
                      <MessageSquare size={14} />
                    </a>
                  </div>
                </div>
              )}

              {member.whatsapp_phone &&
                getWaDigits(member.whatsapp_phone) &&
                getWaDigits(member.whatsapp_phone) !== getWaDigits(member.phone) &&
                getWaDigits(member.whatsapp_phone) !== getWaDigits(member.secondary_phone) &&
                getWaDigits(member.whatsapp_phone) !== getWaDigits(member.member_phone) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>واتساب مخصص آخر:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-success)', fontFamily: 'monospace', dir: 'ltr' }}>
                      {member.whatsapp_phone}
                    </span>
                    <a href={getWaUrl(member.whatsapp_phone)} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '4px', color: '#22c55e' }} title="محادثة واتساب">
                      <MessageSquare size={14} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Graphical Attendance Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Monthly SVG Attendance Chart */}
          <div className="glass-card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '0.65rem',
              marginBottom: '1rem',
              borderBottom: '1px solid var(--border-subtle)',
              color: '#38bdf8',
              fontSize: '0.95rem',
              fontWeight: 700
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} />
                <span>الرسم البياني للحضور والغياب الشهري</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>حسب الجلسات</span>
            </div>

            {history?.monthly_stats && history.monthly_stats.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {history.monthly_stats.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                      <span style={{ color: 'var(--text-muted)' }}>شهر: {m.month}</span>
                      <span style={{ color: m.rate >= 75 ? '#22c55e' : m.rate >= 50 ? '#eab308' : '#ef4444' }}>
                        {m.attended ?? m.present ?? 0} حاضر / {m.total} جلسات ({m.rate}%)
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                      <div
                        style={{
                          width: `${m.rate}%`,
                          background: m.rate >= 75 ? '#22c55e' : m.rate >= 50 ? '#eab308' : '#ef4444',
                          height: '100%',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                لم يتم تسجيل جلسات حضور لهذا المخدوم بعد
              </div>
            )}
          </div>

          {/* Detailed Attendance Timeline */}
          <div className="glass-card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '0.65rem',
              marginBottom: '1rem',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--color-gold)',
              fontSize: '0.95rem',
              fontWeight: 700
            }}>
              <span>سجل الجلسات الأخيرة عبر كافة الفصول</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                إجمالي {history?.timeline?.length || 0} جلسة
              </span>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history?.timeline && history.timeline.length > 0 ? (
                history.timeline.map((item, idx) => {
                  const isAttended = item.attended === true || item.status === 'حاضر';
                  const sessionDate = item.session_date || item.date || '—';
                  const sessionTitle = item.title || item.session_title || 'جلسة الأحد';
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        background: isAttended ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${isAttended ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                        borderRadius: '8px',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {item.class_name || 'الفصل'} - {sessionTitle}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📅 {sessionDate} {item.method ? `• ${item.method}` : ''}
                        </span>
                      </div>

                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          background: isAttended ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: isAttended ? '#86efac' : '#fca5a5'
                        }}
                      >
                        {isAttended ? 'حاضر' : 'غائب'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  لا توجد جلسات مسجلة
                </div>
              )}
            </div>
          </div>

          {/* Standalone QR Code Display & Download */}
          {hasPermission('cards:issue') && (
            <div className="glass-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                color: '#38bdf8',
                fontSize: '0.92rem',
                fontWeight: 700
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <QrCode size={17} />
                  <span>رمز الـ QR المخصص للحضور</span>
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                padding: '12px',
                borderRadius: '12px',
                display: 'inline-flex',
                boxShadow: '0 4px 15px rgba(0,0,0,0.25)'
              }}>
                <canvas ref={qrCanvasRef} style={{ width: '160px', height: '160px', display: 'block' }} />
              </div>

              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                كود مشفر لمسح حضور وغياب التلميذ بالكاميرا
              </p>

              <button
                type="button"
                onClick={downloadPureQR}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0.55rem',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)'
                }}
              >
                <Download size={15} />
                <span>تحميل رمز الـ QR منفصلاً (PNG)</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
