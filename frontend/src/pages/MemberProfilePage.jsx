import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { membersApi } from '../api/members';
import { getPhotoUrl } from '../utils/photo';
import { getWaUrl } from '../utils/phone';
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
  Layers
} from 'lucide-react';

export const MemberProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const qrCanvasRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    membersApi.getMemberById(id)
      .then(res => {
        const data = res.data || res;
        setMember(data);
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

    // Stage
    ctx.fillStyle = '#94a3b8';
    ctx.font = '19px Cairo, system-ui, sans-serif';
    ctx.fillText(member.stage || '', 300, 195);

    // Member ID Box
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(150, 215, 300, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(150, 215, 300, 48);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`ID: ${member.member_id || ''}`, 300, 248);

    // QR Image
    if (qrCanvasRef.current) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(180, 285, 240, 240);
      ctx.drawImage(qrCanvasRef.current, 190, 295, 220, 220);
    }

    // Phone
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Cairo, system-ui, sans-serif';
    ctx.fillText(`تليفون: ${member.phone || ''}`, 300, 575);

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Cairo, system-ui, sans-serif';
    ctx.fillText('رمز QR آمن لحضور التربية الكنسية والأنشطة', 300, 640);

    const link = document.createElement('a');
    const safeName = (member.full_name || 'member').replace(/\s+/g, '_');
    link.download = `بطاقة_${member.member_id}_${safeName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>جاري تحميل الملف الشخصي للمخدوم...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ color: 'var(--color-danger)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>تعذر العثور على المخدوم</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'المخدوم غير موجود أو قد تم حذفه'}</p>
          <button onClick={() => navigate('/members')} className="btn btn-primary">
            العودة لقائمة المخدومين
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="badge badge-success">نشط 🟢</span>;
      case 'Inactive':
        return <span className="badge badge-warning">غير نشط 🟡</span>;
      case 'Archived':
        return <span className="badge badge-danger">مؤرشف 🗄️</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      {/* Top Navigation & Back */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate('/members')}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}
        >
          <ArrowRight size={16} />
          <span>العودة لقائمة المخدومين</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => navigate(`/members/${member.member_id}/edit`)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Edit size={16} />
            <span>تعديل البيانات</span>
          </button>
        </div>
      </div>

      {/* Hero Profile Header Card */}
      <div className="glass-card" style={{ marginBottom: '1.25rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Avatar Photo */}
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: '2.5px solid var(--color-gold)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: 'var(--shadow-sm)'
            }}>
              {member.photo_url ? (
                <img
                  src={getPhotoUrl(member.photo_url)}
                  alt={member.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '1.8rem', color: 'var(--color-gold)', fontWeight: 800 }}>
                  {member.full_name.charAt(0)}
                </span>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {member.full_name}
                </h1>
                {getStatusBadge(member.status)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <span
                  onClick={handleCopyId}
                  title="انقر لنسخ المعرف"
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: 'var(--color-primary-light)',
                    background: 'var(--bg-secondary)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
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
                  المرحلة: <strong style={{ color: 'var(--text-main)' }}>{member.stage || 'غير محدد'}</strong>
                </span>

                {member.group_name && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    المجموعة: <strong style={{ color: 'var(--text-main)' }}>{member.group_name}</strong>
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
                style={{ fontSize: '0.82rem', gap: '0.4rem' }}
                title="اتصال هاتفي"
              >
                <Phone size={15} />
                <span>اتصال</span>
              </a>
            )}

            {(member.whatsapp_phone || member.phone) && (
              <a
                href={getWaUrl(member.whatsapp_phone || member.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.82rem',
                  gap: '0.4rem',
                  color: 'var(--color-success)',
                  borderColor: 'rgba(34, 197, 94, 0.3)'
                }}
                title="محادثة واتساب"
              >
                <MessageSquare size={15} />
                <span>واتساب</span>
              </a>
            )}

            <button
              onClick={downloadQRCard}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', gap: '0.4rem' }}
            >
              <Download size={15} />
              <span>تحميل البطاقة 🎴</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Details + QR Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Left Column: Personal & Contact Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 1. Basic Info Card */}
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
                <span style={{ fontWeight: 600 }}>{member.gender || 'غير محدد'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>المرحلة الدراسية:</span>
                <span style={{ fontWeight: 600 }}>{member.stage || 'عام'}</span>
              </div>

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

              {member.group_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>المجموعة / الأسرة:</span>
                  <span style={{ fontWeight: 600 }}>{member.group_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Contact Numbers Card */}
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
              <span>أرقام الهواتف والتواصل</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>هاتف ولي الأمر:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', dir: 'ltr' }}>{member.phone}</span>
              </div>

              {member.secondary_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>هاتف إضافي:</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', dir: 'ltr' }}>{member.secondary_phone}</span>
                </div>
              )}

              {member.member_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>هاتف المخدوم:</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', dir: 'ltr' }}>{member.member_phone}</span>
                </div>
              )}

              {member.whatsapp_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>واتساب:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-success)', fontFamily: 'monospace', dir: 'ltr' }}>
                    {member.whatsapp_phone}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Address & Health Notes Card */}
          <div className="glass-card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingBottom: '0.65rem',
              marginBottom: '0.85rem',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--color-success)',
              fontSize: '0.95rem',
              fontWeight: 700
            }}>
              <MapPin size={16} />
              <span>العنوان والملاحظات الرعوية</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>العنوان السكني:</div>
                <div style={{ fontWeight: 500, background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  {member.address || 'لا يوجد عنوان مسجل'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ملاحظات الخدمة والرعاية:</div>
                <div style={{ fontWeight: 500, background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', minHeight: '48px' }}>
                  {member.notes || 'لا توجد ملاحظات مسجلة'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QR Code & Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              color: 'var(--color-gold)',
              fontSize: '1rem',
              fontWeight: 700
            }}>
              <QrCode size={18} />
              <span>بطاقة QR الرسمية</span>
            </div>

            {/* QR Canvas */}
            <div style={{
              display: 'inline-flex',
              padding: '12px',
              background: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '1rem'
            }}>
              <canvas ref={qrCanvasRef} style={{ display: 'block' }} />
            </div>

            <div style={{
              fontSize: '0.85rem',
              fontFamily: 'monospace',
              color: 'var(--color-primary-light)',
              marginBottom: '1.25rem'
            }}>
              {member.member_id}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                onClick={downloadQRCard}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', fontSize: '0.88rem' }}
              >
                <Download size={16} />
                <span>تحميل بطاقة المخدوم للطباعة</span>
              </button>

              <button
                onClick={handleCopyId}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
              >
                {copied ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
                <span>{copied ? 'تم نسخ المعرف بنجاح' : 'نسخ كود المخدوم'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
