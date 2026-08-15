import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { attendanceApi } from '../api/attendance';
import { membersApi } from '../api/members';
import { eventsApi } from '../api/events';
import {
  UserCheck,
  QrCode,
  Smartphone,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lock,
  Unlock,
  Users,
  Calendar,
  Sparkles,
  X,
  AlertCircle,
  Trash2,
  Camera,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award
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

export const AttendanceManagement = () => {
  // Sessions states
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Live Records states
  const [records, setRecords] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recSearch, setRecSearch] = useState('');

  // Scanner & Motor Input States
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success'|'warning'|'error', message: '' }
  const [scanSubmitting, setScanSubmitting] = useState(false);

  // New Session Modal
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    title: `حضور اجتماع الأحد - ${new Date().toLocaleDateString('ar-EG')}`,
    session_date: new Date().toISOString().split('T')[0],
    stage: 'ALL',
    recurrence: 'Weekly',
    event_id: ''
  });
  const [sessionFormLoading, setSessionFormLoading] = useState(false);

  // Device Modal
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceName, setDeviceName] = useState('تابلت خدمة الكنيسة');
  const [activeDeviceToken, setActiveDeviceToken] = useState(() => localStorage.getItem('almasalla_device_token') || '');

  // Cancel Attendance Modal
  const [cancellingRecord, setCancellingRecord] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const html5QrcodeRef = useRef(null);
  const scannerContainerId = 'attendance-qr-reader';

  // Fetch Open & Recent Sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await attendanceApi.getSessions({ limit: 30 });
      if (res.success) {
        setSessions(res.data.items);
        if (res.data.items.length > 0 && !selectedSession) {
          setSelectedSession(res.data.items[0]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر تحميل جلسات الحضور');
    } finally {
      setLoading(false);
    }
  }, [selectedSession]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch Session Live Attendance Records
  const fetchRecords = useCallback(async (sessionId, search = '') => {
    if (!sessionId) return;
    setRecLoading(true);
    try {
      const res = await attendanceApi.getSessionRecords(sessionId, { status: 'Valid', search });
      if (res.success) {
        setRecords(res.data);
      }
    } catch (err) {
      // Ignore transient fetch error
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchRecords(selectedSession.session_id);
    }
  }, [selectedSession, fetchRecords]);

  // Start Camera QR Scanner Mode
  const startCamera = async () => {
    setScanFeedback(null);
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
          // Process scan continuous motor
          handleProcessAttendance(decodedText, 'QR');
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      setScanFeedback({ type: 'error', message: 'تعذر فتح الكاميرا. يرجى التأكد من إعطاء إذن الكاميرا أو استخدام الإدخال اليدوي.' });
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current && cameraActive) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (e) {}
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [cameraActive]);

  // UNIFIED ATTENDANCE MOTOR CALL
  const handleProcessAttendance = async (tokenOrId, method = 'QR') => {
    if (!selectedSession || !tokenOrId || !tokenOrId.trim()) return;
    if (scanSubmitting) return; // Prevent double rapid firing

    setScanSubmitting(true);
    setScanFeedback(null);

    try {
      const res = await attendanceApi.scanAttendance(
        {
          session_id: selectedSession.session_id,
          token_or_id: tokenOrId.trim(),
          method
        },
        activeDeviceToken
      );

      if (res.success) {
        setScanFeedback({
          type: 'success',
          message: `تم تسجيل حضور الطفل (${res.data.member_name}) بنجاح 🟢`
        });
        setManualInput('');

        // Refresh records & session metrics
        fetchRecords(selectedSession.session_id);
        const sRes = await attendanceApi.getSessionById(selectedSession.session_id);
        if (sRes.success) setSelectedSession(sRes.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل تسجيل الحضور';
      if (msg.includes('مسجل حضوره بالفعل')) {
        setScanFeedback({ type: 'warning', message: `⚠️ ${msg}` });
      } else {
        setScanFeedback({ type: 'error', message: `❌ ${msg}` });
      }
    } finally {
      setScanSubmitting(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleProcessAttendance(manualInput, 'Manual');
  };

  // Open / Close Session
  const handleToggleSessionStatus = async () => {
    if (!selectedSession) return;
    const newStatus = selectedSession.status === 'Open' ? 'Closed' : 'Open';
    try {
      const res = await attendanceApi.updateSessionStatus(selectedSession.session_id, newStatus);
      if (res.success) {
        setSelectedSession(res.data);
        fetchSessions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تغيير حالة الجلسة');
    }
  };

  // Create Session submit
  const handleCreateSessionSubmit = async (e) => {
    e.preventDefault();
    setSessionFormLoading(true);
    try {
      const res = await attendanceApi.createSession(sessionFormData);
      if (res.success) {
        setIsSessionModalOpen(false);
        setSelectedSession(res.data);
        fetchSessions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إنشاء جلسة جديدة');
    } finally {
      setSessionFormLoading(false);
    }
  };

  // Register device submit
  const handleRegisterDeviceSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await attendanceApi.registerDevice({ device_name: deviceName });
      if (res.success) {
        const token = res.data.device_token;
        localStorage.setItem('almasalla_device_token', token);
        setActiveDeviceToken(token);
        alert(`تم اعتماد هذا الجهاز بنجاح باسم "${res.data.device_name}"`);
        setIsDeviceModalOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'فشل اعتماد الجهاز');
    }
  };

  // Cancel Attendance submit
  const handleCancelAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingRecord || !cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await attendanceApi.cancelRecord(cancellingRecord.record_id, cancelReason.trim());
      setCancellingRecord(null);
      setCancelReason('');
      fetchRecords(selectedSession.session_id);
      const sRes = await attendanceApi.getSessionById(selectedSession.session_id);
      if (sRes.success) setSelectedSession(sRes.data);
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تصحيح إدخال الحضور');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={28} style={{ color: '#34d399' }} />
            <span>نظام تسجيل الحضور المصرح به</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            تسجيل الحضور الفعلي بالربط الثلاثي المحكم (جلسة مفتوحة + خادم مصرح له + جهاز معتمد)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setIsSessionModalOpen(true)} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={18} />
            <span>فتح جلسة جديدة</span>
          </button>

          <button onClick={() => setIsDeviceModalOpen(true)} className="btn btn-secondary" style={{ gap: '0.4rem' }}>
            <Smartphone size={18} style={{ color: activeDeviceToken ? '#34d399' : 'var(--text-muted)' }} />
            <span>{activeDeviceToken ? 'الجهاز معتمد 🟢' : 'اعتماد جهاز'}</span>
          </button>
        </div>
      </div>

      {/* 2. Active Session Selector & Metrics Dashboard */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Session Selector bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <Calendar size={22} style={{ color: '#38bdf8' }} />
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '2px' }}>الجلسة المستهدفة حالياً:</label>
              <select
                className="form-input"
                style={{ fontWeight: 700, color: 'var(--text-main)' }}
                value={selectedSession?.session_id || ''}
                onChange={(e) => {
                  const found = sessions.find(s => s.session_id === e.target.value);
                  setSelectedSession(found);
                }}
              >
                {sessions.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {s.title} ({s.session_date}) — [{s.status === 'Open' ? 'مفتوحة 🟢' : 'مغلقة 🔴'}] — {s.stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedSession && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              
              {/* Recurrence Change Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>التكرار:</span>
                <select
                  className="form-input"
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.78rem', width: 'auto', background: 'none', border: 'none', color: '#fbbf24', fontWeight: 800 }}
                  value={selectedSession.recurrence || 'Weekly'}
                  onChange={async (e) => {
                    const newRec = e.target.value;
                    try {
                      const res = await attendanceApi.updateSessionRecurrence(selectedSession.session_id, newRec);
                      if (res.success) {
                        setSelectedSession(res.data);
                        fetchSessions();
                      }
                    } catch (err) {
                      alert(err.response?.data?.message || 'تعذر تغيير تكرار الجلسة');
                    }
                  }}
                >
                  <option value="Weekly">أسبوعية 📅</option>
                  <option value="Daily">يومية / مؤتمر ☀️</option>
                  <option value="Monthly">شهريّة 🗓️</option>
                  <option value="OneTime">مرة واحدة فقط (عدم التكرار) 🛑</option>
                </select>
              </div>

              <span
                className="badge"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  background: selectedSession.status === 'Open' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: selectedSession.status === 'Open' ? '#34d399' : '#f87171',
                  border: `1px solid ${selectedSession.status === 'Open' ? '#34d39940' : '#f8717140'}`
                }}
              >
                {selectedSession.status === 'Open' ? 'جلسة مفتوحة للتسجيل 🔓' : 'جلسة مغلقة 🔒'}
              </span>

              <button
                onClick={handleToggleSessionStatus}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', gap: '4px' }}
              >
                {selectedSession.status === 'Open' ? <Lock size={15} /> : <Unlock size={15} />}
                <span>{selectedSession.status === 'Open' ? 'إغلاق الجلسة' : 'إعادة فتح الجلسة'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Selected Session Metrics Progress Bar */}
        {selectedSession && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>الأطفال الحاضرون الآن</span>
              <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399' }}>
                {selectedSession.present_count} طفل
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>المستهدفون النشطون بالمرحلة ({selectedSession.stage})</span>
              <strong style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>
                {selectedSession.targeted_count} طفل
              </strong>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>نسبة الحضور الحقيقية</span>
                <strong style={{ color: '#38bdf8' }}>{selectedSession.attendance_percentage}%</strong>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, selectedSession.attendance_percentage)}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8 0%, #34d399 100%)' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Fast Scanner & Unified Motor Section */}
      {selectedSession && selectedSession.status === 'Open' ? (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)' }}>
          
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <QrCode size={24} style={{ color: '#38bdf8' }} />
              <span>وضع القارئ السريع الموحد (Fast Scanner Mode)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              امسح بطاقة الـ QR أو ادخل الرمز يدوياً لتسجيل الحضور فوراً بالربط الثلاثي المعتمد
            </p>
          </div>

          {/* Feedback Banner */}
          {scanFeedback && (
            <div
              className="animate-fade-in"
              style={{
                width: '100%',
                maxWidth: '520px',
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.95rem',
                background: scanFeedback.type === 'success' ? 'rgba(52, 211, 153, 0.2)' : scanFeedback.type === 'warning' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1.5px solid ${scanFeedback.type === 'success' ? '#34d399' : scanFeedback.type === 'warning' ? '#fbbf24' : '#f87171'}`,
                color: scanFeedback.type === 'success' ? '#6ee7b7' : scanFeedback.type === 'warning' ? '#fde047' : '#fca5a5'
              }}
            >
              {scanFeedback.message}
            </div>
          )}

          {/* Scanner / Camera View Container */}
          <div style={{ width: '100%', maxWidth: '380px', position: 'relative' }}>
            <div
              id={scannerContainerId}
              style={{
                width: '100%',
                minHeight: '240px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#0f172a',
                border: '2px dashed rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />

            {!cameraActive && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: '#0f172a', borderRadius: '16px', zIndex: 5 }}>
                <Camera size={44} style={{ color: '#38bdf8', opacity: 0.8 }} />
                <button onClick={startCamera} className="btn btn-primary">
                  <Camera size={18} />
                  <span>تشغيل كاميرا الـ QR المستمرة</span>
                </button>
              </div>
            )}
          </div>

          {/* Manual Input Motor */}
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '420px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="أو أدخل رمز العضوية K-XXXXXX أو ابحث يدويًا..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary" disabled={scanSubmitting || !manualInput.trim()}>
              <CheckCircle size={16} />
              <span>تسجيل</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          🔒 هذه الجلسة مغلقة حالياً — يرجى فتح الجلسة أولاً لتفعيل وضع القارئ السريع وتسجيل الحضور.
        </div>
      )}

      {/* 4. Live Attendance Feed Table */}
      {selectedSession && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} style={{ color: '#38bdf8' }} />
              <span>كشف الحاضرين في الجلسة ({records.length} طفل)</span>
            </h3>

            <input
              type="text"
              className="form-input"
              style={{ width: '220px', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
              placeholder="تصفية في الحاضرين..."
              value={recSearch}
              onChange={(e) => {
                setRecSearch(e.target.value);
                fetchRecords(selectedSession.session_id, e.target.value);
              }}
            />
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>وقت الحضور</th>
                  <th>رمز العضوية</th>
                  <th>اسم الطفل الحاضر</th>
                  <th>المرحلة</th>
                  <th>طريقة المسح</th>
                  <th>الخادم المسجل</th>
                  <th style={{ textAlign: 'center' }}>إلغاء / تصحيح</th>
                </tr>
              </thead>
              <tbody>
                {recLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>جاري تحميل كشف الحاضرين...</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      لم يتم تسجيل حضور أي طفل في هذه الجلسة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const timeStr = r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <tr key={r.record_id}>
                        <td style={{ fontWeight: 800, color: '#34d399', dir: 'ltr', textAlign: 'right' }}>
                          {timeStr}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                            {r.member_id}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {r.member_name}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{r.member_stage}</td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.12)', color: '#e2e8f0' }}>
                            {r.method === 'QR' ? 'ماسح 📷' : 'يدوي ⌨️'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {r.scanned_by_name || 'الخادم المسجل'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => { setCancellingRecord(r); setCancelReason(''); }}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', color: '#f87171' }}
                            title="إلغاء وتصحيح الحضور"
                          >
                            <XCircle size={15} />
                            <span>تصحيح</span>
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
      )}

      {/* 5. Create Session Modal */}
      {isSessionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                فتح جلسة حضور جديدة
              </h3>
              <button onClick={() => setIsSessionModalOpen(false)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <form id="createSessionForm" onSubmit={handleCreateSessionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">عنوان الجلسة *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={sessionFormData.title}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                    placeholder="مثال: حضور اجتماع الأحد - 15 أغسطس"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">تاريخ الجلسة *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={sessionFormData.session_date}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, session_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">المرحلة المستهدفة *</label>
                    <select
                      className="form-input"
                      value={sessionFormData.stage}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, stage: e.target.value })}
                    >
                      {STAGE_OPTIONS.map((stg) => (
                        <option key={stg} value={stg}>{stg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">تصنيف وتكرار الجلسة الخدمية 🔄</label>
                  <select
                    className="form-input"
                    value={sessionFormData.recurrence}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, recurrence: e.target.value })}
                  >
                    <option value="Weekly">جلسة أسبوعية (Weekly) 📅</option>
                    <option value="Daily">جلسة يومية / مؤتمر (Daily) ☀️</option>
                    <option value="Monthly">جلسة شهريّة (Monthly) 🗓️</option>
                    <option value="OneTime">مرة واحدة فقط - لن تتكرر مستقبلاً (OneTime) 🛑</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setIsSessionModalOpen(false)} className="btn btn-secondary">إلغاء</button>
              <button type="submit" form="createSessionForm" className="btn btn-primary" disabled={sessionFormLoading}>
                {sessionFormLoading ? 'جاري الفتح...' : 'فتح الجلسة الان 🔓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Register Device Modal */}
      {isDeviceModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', background: '#1e293b', boxShadow: 'var(--shadow-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smartphone size={22} style={{ color: '#34d399' }} />
                <span>اعتماد هذا الجهاز للتسجيل</span>
              </h3>
              <button onClick={() => setIsDeviceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleRegisterDeviceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">اسم جهاز الخدمة (مثال: تابلت الكنيسة 1) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="أدخل اسم الجهاز المصرح به"
                  required
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(56, 189, 248, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                ℹ️ سيتم توليد رمز أمان فريد (Device Token) وحفظه بالمتصفح لإتمام الربط الثلاثي المعتمد.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsDeviceModalOpen(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary">تأكيد اعتماد الجهاز</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Cancel Record Modal */}
      {cancellingRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', background: '#1e293b', boxShadow: 'var(--shadow-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                تصحيح/إلغاء حضور: {cancellingRecord.member_name}
              </h4>
              <button onClick={() => setCancellingRecord(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCancelAttendanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">سبب تصحيح/إلغاء تسجيل الحضور *</label>
                <input
                  type="text"
                  className="form-input"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="مثال: تم مسح البطاقة بالخطأ لطلب مرحلة أخرى"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setCancellingRecord(null)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#ef4444' }} disabled={cancelLoading}>
                  {cancelLoading ? 'جاري الإلغاء...' : 'تأكيد الإلغاء والتصحيح'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
