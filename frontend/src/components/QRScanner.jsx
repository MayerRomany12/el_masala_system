import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { cardsApi } from '../api/cards';
import {
  QrCode,
  Camera,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
  Phone,
  Sparkles,
  Calendar,
  X,
  ShieldCheck,
  Search
} from 'lucide-react';

export const QRScanner = ({ onBack }) => {
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannedMember, setScannedMember] = useState(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');

  const html5QrcodeRef = useRef(null);
  const scannerContainerId = 'qr-reader-container';

  // Start Camera Scanner
  const startCamera = async () => {
    setError('');
    setCameraError('');
    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      await html5QrcodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Successfully scanned a QR token
          await stopCamera();
          handleTokenScanned(decodedText);
        },
        (errorMessage) => {
          // Ignore transient frame scanning failures
        }
      );
      setScanning(true);
    } catch (err) {
      setCameraError('تعذر فتح الكاميرا. يرجى التأكد من السماح بإذن الكاميرا أو كتابة الرمز يدوياً.');
      setScanning(false);
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    if (html5QrcodeRef.current && scanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Submit scanned token to backend
  const handleTokenScanned = async (token) => {
    if (!token || !token.trim()) return;
    setLoading(true);
    setError('');
    setScannedMember(null);

    try {
      const res = await cardsApi.scanQRToken(token.trim());
      if (res.success) {
        setScannedMember(res.data);
      } else {
        setError(res.message || 'رمز QR غير معروف');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر التحقق من رمز QR. قد يكون الرمز خاطئاً أو غير مسجل.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleTokenScanned(manualToken);
  };

  const handleReset = () => {
    setScannedMember(null);
    setError('');
    setManualToken('');
    startCamera();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={26} style={{ color: '#38bdf8' }} />
            <span>ماسح بطاقات العضوية QR</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            مسح الـ QR Code الأولي للتحقق من هوية الطفل وعرض ملفه الكامل (معاينة فقط — تسجيل الحضور في M5)
          </p>
        </div>

        {onBack && (
          <button onClick={onBack} className="btn btn-secondary">
            رجوع
          </button>
        )}
      </div>

      {/* Main Scanner Section */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        
        {/* Camera Container */}
        <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
          <div
            id={scannerContainerId}
            style={{
              width: '100%',
              minHeight: '260px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#0f172a',
              border: '2px dashed rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />

          {!scanning && !loading && !scannedMember && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: '#0f172a', borderRadius: '16px', zIndex: 5 }}>
              <Camera size={48} style={{ color: '#38bdf8', opacity: 0.8 }} />
              <button onClick={startCamera} className="btn btn-primary">
                <Camera size={18} />
                <span>تشغيل الكاميرا للمسح</span>
              </button>
            </div>
          )}
        </div>

        {cameraError && (
          <div style={{ fontSize: '0.85rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', width: '100%', textAlign: 'center' }}>
            {cameraError}
          </div>
        )}

        {/* Manual Input Fallback */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="أو أدخل الـ Token يدوياً للاختبار..."
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" disabled={loading || !manualToken.trim()}>
            <Search size={16} />
            <span>فحص</span>
          </button>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>
          <RefreshCw size={28} className="spin" style={{ color: '#38bdf8', marginBottom: '0.5rem' }} />
          <div>جاري التحقق من الـ QR Token وجلب ملف الطفل...</div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="glass-card" style={{ padding: '1rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={22} />
            <span>{error}</span>
          </div>
          <button onClick={handleReset} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Result Profile Modal Card */}
      {scannedMember && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', border: '2px solid #34d399', background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#34d399', fontWeight: 800 }}>
              <ShieldCheck size={24} />
              <span style={{ fontSize: '1.1rem' }}>تم التحقق من بطاقة المخدوم بنجاح 🟢</span>
            </div>
            <button onClick={handleReset} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              مسح بطاقة أخرى
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '16px', background: 'rgba(56, 189, 248, 0.15)', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <User size={38} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>
                {scannedMember.full_name}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  {scannedMember.member_id}
                </span>

                <span style={{ color: '#e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={16} style={{ color: '#a855f7' }} />
                  {scannedMember.stage}
                </span>

                {scannedMember.group_name && (
                  <span style={{ color: '#94a3b8' }}>فصل: {scannedMember.group_name}</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>تليفون ولي الأمر</span>
              <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{scannedMember.phone}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>تاريخ الميلاد</span>
              <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{scannedMember.date_of_birth || 'غير مسجل'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>حالة الحساب</span>
              <strong style={{ color: scannedMember.status === 'Active' ? '#34d399' : '#fb923c', fontSize: '0.95rem' }}>
                {scannedMember.status === 'Active' ? 'نشط' : scannedMember.status}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.6rem 0.8rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.2)', fontSize: '0.8rem', color: '#6ee7b7' }}>
            ℹ️ ملاحظة: تمت العملية بنجاح لعرض ملف المخدوم فقط. تسجيل الحضور والخصومات يتوفر في Milestone 5 بالربط الثلاثي المعتمد.
          </div>
        </div>
      )}
    </div>
  );
};
