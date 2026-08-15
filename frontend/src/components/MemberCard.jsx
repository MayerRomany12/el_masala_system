import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Church, Sparkles, Calendar, ShieldCheck, User } from 'lucide-react';
import churchLogo from '../assets/church_logo.png';

// Dynamic stage color resolution (prefix/substring matching)
export const getStageTheme = (stage = '') => {
  const s = stage.toLowerCase();
  if (s.includes('حضانة') || s.includes('kg')) {
    return { name: 'purple', accent: '#a855f7', gradient: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)', bg: 'rgba(168, 85, 247, 0.12)' };
  }
  if (s.includes('ابتدائي') || s.includes('primary')) {
    return { name: 'blue', accent: '#38bdf8', gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', bg: 'rgba(56, 189, 248, 0.12)' };
  }
  if (s.includes('إعدادي') || s.includes('middle') || s.includes('prep')) {
    return { name: 'green', accent: '#34d399', gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', bg: 'rgba(52, 211, 153, 0.12)' };
  }
  if (s.includes('ثانوي') || s.includes('secondary')) {
    return { name: 'red', accent: '#f87171', gradient: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)', bg: 'rgba(248, 113, 113, 0.12)' };
  }
  if (s.includes('جامعة') || s.includes('خريجين') || s.includes('univ')) {
    return { name: 'gold', accent: '#fbbf24', gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)', bg: 'rgba(251, 191, 36, 0.12)' };
  }
  return { name: 'slate', accent: '#94a3b8', gradient: 'linear-gradient(135deg, #475569 0%, #94a3b8 100%)', bg: 'rgba(148, 163, 184, 0.12)' };
};

export const MemberCard = ({ member, activeSide = 'front' }) => {
  const canvasRef = useRef(null);
  const [qrError, setQrError] = useState(false);

  const theme = getStageTheme(member?.stage);

  // Render QR Code onto canvas (Opaque Token ONLY)
  useEffect(() => {
    if (canvasRef.current && member?.qr_token) {
      QRCode.toCanvas(
        canvasRef.current,
        member.qr_token, // Pure opaque token string
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) setQrError(true);
        }
      );
    }
  }, [member?.qr_token]);

  if (!member) return null;

  const issueDateStr = member.card_issued_at
    ? new Date(member.card_issued_at).toLocaleDateString('ar-EG')
    : new Date().toLocaleDateString('ar-EG');

  return (
    <div className="printable-card-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      
      {/* 85.6mm x 54mm standard credit card aspect ratio container */}
      <div
        className="credit-card-box"
        style={{
          width: '340px',
          height: '214px',
          borderRadius: '16px',
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          border: `2px solid ${theme.accent}`,
          boxShadow: `0 10px 30px -5px ${theme.accent}33`,
          position: 'relative',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: 'Cairo, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between',
          padding: '12px 16px',
          boxSizing: 'border-box'
        }}
      >
        {/* Background decorative watermark */}
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '-20px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: theme.accent,
            opacity: 0.08,
            filter: 'blur(20px)',
            pointerEvents: 'none'
          }}
        />

        {activeSide === 'front' ? (
          /* FRONT SIDE OF CARD */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212, 175, 55, 0.25)', paddingBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', padding: '1px', background: 'linear-gradient(135deg, #d4af37 0%, #7a081d 100%)', boxShadow: '0 0 10px rgba(212, 175, 55, 0.4)' }}>
                  <img src={churchLogo} alt="شعار الكنيسة" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-gold-light)', lineHeight: 1.1 }}>
                    كنيسة العذراء مريم والأنبا بولا
                  </div>
                  <div style={{ fontSize: '0.62rem', color: theme.accent, fontWeight: 700 }}>
                    نظام خدمة مدارس الأحد بالمسلة
                  </div>
                </div>
              </div>

              {/* Stage Badge */}
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: theme.accent,
                  background: theme.bg,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: `1px solid ${theme.accent}40`
                }}
              >
                {member.stage.split('-')[0].trim()}
              </div>
            </div>

            {/* Main Content: Avatar & Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '6px 0' }}>
              {/* Photo Frame / Avatar */}
              <div
                style={{
                  width: '62px',
                  height: '62px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                  border: `2px solid ${theme.accent}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.accent,
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              >
                <User size={34} />
              </div>

              {/* Name & Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {member.full_name}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Sparkles size={12} style={{ color: theme.accent }} />
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{member.stage}</span>
                </div>

                {member.group_name && (
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>
                    فصل: {member.group_name}
                  </div>
                )}
              </div>
            </div>

            {/* Footer / ID Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                رقم العضوية الدائم
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: theme.accent,
                  letterSpacing: '1px'
                }}
              >
                {member.member_id}
              </div>
            </div>
          </div>
        ) : (
          /* BACK SIDE OF CARD */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            
            {/* Back Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} style={{ color: theme.accent }} />
                <span>بطاقة عضوية معتمدة — كنيسة المسلة</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 800, color: theme.accent }}>
                {member.member_id}
              </div>
            </div>

            {/* Center Area: QR Code & Dates */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '4px 0' }}>
              
              {/* Dates & Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', flex: 1 }}>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.62rem' }}>تاريخ الميلاد</span>
                  <strong style={{ color: '#f8fafc' }}>{member.date_of_birth || 'غير مسجل'}</strong>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.62rem' }}>تاريخ تفعيل البطاقة</span>
                  <strong style={{ color: theme.accent }}>{issueDateStr}</strong>
                </div>

                <div style={{ fontSize: '0.58rem', color: '#64748b', marginTop: '2px', lineHeight: 1.2 }}>
                  * تُستخدم هذه البطاقة لمسح الـ QR والتحقق من العضوية.
                </div>
              </div>

              {/* QR Code Canvas */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '5px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  flexShrink: 0
                }}
              >
                <canvas ref={canvasRef} style={{ width: '105px', height: '105px', display: 'block' }} />
              </div>
            </div>

            {/* Back Footer */}
            <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
              رمز آمن مشفر (Opaque Token) — غير قابل للتغيير
            </div>
          </div>
        )}
      </div>

      {/* Hidden Print Layout for standard card printers */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .credit-card-box, .credit-card-box * {
            visibility: visible;
          }
          .credit-card-box {
            position: absolute;
            left: 0;
            top: 0;
            width: 85.6mm !important;
            height: 54mm !important;
            box-shadow: none !important;
            border: 1px solid #000 !important;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};
