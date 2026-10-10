import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { attendanceApi } from '../api/attendance';
import { membersApi } from '../api/members';
import { getPhotoUrl } from '../utils/photo';
import { getWaUrl } from '../utils/phone';
import { WhatsAppButton } from '../components/WhatsAppButton';
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
  Printer,
  FileSpreadsheet,
  Download,
  Filter,
  Phone,
  MessageSquare,
  Layers,
  ChevronDown
} from 'lucide-react';

// Helper to generate Arabic weekday and date string (e.g. جلسة حضور يوم السبت 29 سبتمبر 2026)
const formatArabicSessionTitle = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const monthsOfYear = [
        'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      const dayName = daysOfWeek[d.getDay()];
      const monthName = monthsOfYear[d.getMonth()];
      return `جلسة حضور يوم ${dayName} ${day} ${monthName} ${year}`;
    }
  } catch (e) {}
  return `جلسة حضور ${dateStr}`;
};

export const AttendanceManagement = () => {
  const { hasPermission, hasAnyPermission } = useAuth();

  // Classes & Sessions states
  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Numbered Class Attendance Sheet states
  const [sheetItems, setSheetItems] = useState([]);
  const [sheetStats, setSheetStats] = useState({
    total_members: 0,
    present_count: 0,
    absent_count: 0,
    attendance_rate: 0
  });
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetSearch, setSheetSearch] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'PRESENT' | 'ABSENT'
  const [togglingMemberId, setTogglingMemberId] = useState(null);

  // QR Camera & Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [recentScanResult, setRecentScanResult] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [manualScanInput, setManualScanInput] = useState('');

  const scannerContainerId = 'qr-attendance-viewfinder';
  const html5QrcodeRef = useRef(null);
  const isScanLockedRef = useRef(false);
  const lastScannedTokenRef = useRef('');
  const cooldownIntervalRef = useRef(null);
  const cooldownTimeoutRef = useRef(null);

  // New Session Modal
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    selected_class_ids: [],
    title: formatArabicSessionTitle(new Date().toISOString().split('T')[0]),
    session_date: new Date().toISOString().split('T')[0],
    recurrence: 'Weekly'
  });
  const [sessionFormLoading, setSessionFormLoading] = useState(false);

  // Audio Synthesizer (Instant acoustic feedback)
  const playFeedbackSound = useCallback((type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.28, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.42);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(493.88, ctx.currentTime);
        osc.frequency.setValueAtTime(415.30, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.32, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(155, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.32, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      // Audio fails silently if blocked
    }
  }, []);

  // 1. Fetch Assigned Classes
  const fetchClasses = useCallback(async () => {
    try {
      const res = await apiClient.get('/classes?limit=200');
      const items = res?.data?.data?.items || res?.data?.items || [];
      setClassesList(items);
      if (items.length > 0 && !selectedClassId) {
        setSelectedClassId(items[0].class_id);
      }
    } catch (err) {
      console.error('Failed to load classes', err);
    }
  }, [selectedClassId]);

  // 2. Fetch Sessions for the selected class
  const fetchSessions = useCallback(async (classId) => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 30 };
      if (classId) {
        params.class_id = classId;
      }
      const res = await attendanceApi.getSessions(params);
      if (res.success) {
        const items = res.data.items || [];
        setSessions(items);
        if (items.length > 0) {
          setSelectedSession(items[0]);
        } else {
          setSelectedSession(null);
          setSheetItems([]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر تحميل جلسات الحضور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (selectedClassId) {
      fetchSessions(selectedClassId);
    }
  }, [selectedClassId, fetchSessions]);

  // 3. Fetch Numbered Sheet for the selected session
  const fetchSessionSheet = useCallback(async (sessionId, search = '') => {
    if (!sessionId) return;
    setSheetLoading(true);
    try {
      const res = await attendanceApi.getSessionSheet(sessionId, search);
      if (res.success) {
        const items = res.data.items || res.data.members || [];
        setSheetItems(items);
        if (res.data.stats || res.data.summary) {
          setSheetStats(res.data.stats || res.data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching session sheet:', err);
    } finally {
      setSheetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionSheet(selectedSession.session_id, sheetSearch);
    }
  }, [selectedSession, sheetSearch, fetchSessionSheet]);

  // 4. Toggle Attendance for Member (Instant 1-Click Action)
  const handleToggleAttendance = async (memberId) => {
    if (!selectedSession || togglingMemberId) return;

    // Optimistic UI update
    setTogglingMemberId(memberId);
    const target = sheetItems.find(m => m.member_id === memberId);
    const newAttended = !target?.attended;

    setSheetItems(prev => prev.map(m => {
      if (m.member_id === memberId) {
        return {
          ...m,
          attended: newAttended,
          scanned_at: newAttended ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : null,
          method: newAttended ? 'يدوي' : null
        };
      }
      return m;
    }));

    setSheetStats(prev => {
      const diff = newAttended ? 1 : -1;
      const newPresent = Math.max(0, prev.present_count + diff);
      const newAbsent = Math.max(0, prev.absent_count - diff);
      const total = prev.total_members || (newPresent + newAbsent) || 1;
      return {
        ...prev,
        present_count: newPresent,
        absent_count: newAbsent,
        attendance_rate: Math.round((newPresent / total) * 1000) / 10
      };
    });

    playFeedbackSound(newAttended ? 'success' : 'warning');

    try {
      await attendanceApi.toggleMemberAttendance(selectedSession.session_id, memberId);
    } catch (err) {
      // Revert if server fails
      alert(err.response?.data?.message || 'تعذر تسجيل حالة الحضور');
      fetchSessionSheet(selectedSession.session_id, sheetSearch);
    } finally {
      setTogglingMemberId(null);
    }
  };

  // 5. Toggle Session Open/Closed
  const handleToggleSessionStatus = async () => {
    if (!selectedSession) return;
    const newStatus = selectedSession.status === 'Open' ? 'Closed' : 'Open';
    try {
      const res = await attendanceApi.updateSessionStatus(selectedSession.session_id, newStatus);
      if (res.success) {
        setSelectedSession(res.data);
        setSessions(prev => prev.map(s => s.session_id === res.data.session_id ? res.data : s));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'فشل تغيير حالة الجلسة');
    }
  };

  // 6. Camera QR Scanning
  const handleToggleScanner = async () => {
    if (cameraActive || isScannerOpen) {
      await stopCamera();
    } else {
      if (!selectedSession) {
        alert('يرجى اختيار جلسة حضور مفتوحة أولاً لبدء المسح بالكاميرا');
        return;
      }
      setIsScannerOpen(true);
      setTimeout(() => {
        startCamera();
      }, 250);
    }
  };

  const startCamera = async () => {
    setScanFeedback(null);
    setRecentScanResult(null);
    isScanLockedRef.current = false;
    lastScannedTokenRef.current = '';

    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode(scannerContainerId, {
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false
        });
      }

      await html5QrcodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: (w, h) => {
            const minEdge = Math.min(w, h);
            const edge = Math.floor(minEdge * 0.8);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          if (isScanLockedRef.current) return;
          const token = decodedText?.trim();
          if (!token || lastScannedTokenRef.current === token) return;

          isScanLockedRef.current = true;
          lastScannedTokenRef.current = token;

          try {
            const res = await attendanceApi.scanAttendance({
              session_id: selectedSession.session_id,
              token_or_id: token,
              qr_token: token,
              method: 'QR'
            });

            playFeedbackSound('success');
            setRecentScanResult({
              status: 'success',
              title: 'تم تسجيل الحضور بنجاح ✓',
              name: res.data?.member_name || token
            });

            // Refresh sheet
            fetchSessionSheet(selectedSession.session_id, sheetSearch);

            // Cooldown 2 seconds
            setCooldownSeconds(2);
            cooldownIntervalRef.current = setInterval(() => {
              setCooldownSeconds(c => {
                if (c <= 1) {
                  clearInterval(cooldownIntervalRef.current);
                  isScanLockedRef.current = false;
                  lastScannedTokenRef.current = '';
                  return 0;
                }
                return c - 1;
              });
            }, 1000);

          } catch (scanErr) {
            playFeedbackSound('warning');
            const msg = scanErr.response?.data?.detail || scanErr.response?.data?.message || 'كارت غير صالح';
            setRecentScanResult({
              status: 'warning',
              title: 'تنبيه مسح الكارت',
              name: msg
            });
            setTimeout(() => {
              isScanLockedRef.current = false;
              lastScannedTokenRef.current = '';
            }, 1500);
          }
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      alert('تعذر فتح الكاميرا، يرجى التأكد من صلاحية الوصول للكاميرا في المتصفح.');
      setCameraActive(false);
      setIsScannerOpen(false);
    }
  };

  const stopCamera = async () => {
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        await html5QrcodeRef.current.clear();
      } catch (e) {
        // ignore
      }
    }
    setCameraActive(false);
    setIsScannerOpen(false);
  };

  // 6b. Manual / Barcode Scanner Input
  const handleManualScanSubmit = async (e) => {
    e.preventDefault();
    if (!manualScanInput.trim() || !selectedSession) return;
    const token = manualScanInput.trim();
    setManualScanInput('');

    try {
      const res = await attendanceApi.scanAttendance({
        session_id: selectedSession.session_id,
        token_or_id: token,
        qr_token: token,
        method: 'Manual'
      });

      playFeedbackSound('success');
      setRecentScanResult({
        status: 'success',
        title: 'تم تسجيل الحضور بنجاح ✓',
        name: res.data?.member_name || token
      });
      fetchSessionSheet(selectedSession.session_id, sheetSearch);
    } catch (scanErr) {
      playFeedbackSound('warning');
      const msg = scanErr.response?.data?.detail || scanErr.response?.data?.message || 'كارت أو رمز غير صالح';
      setRecentScanResult({
        status: 'warning',
        title: 'تنبيه مسح الكارت',
        name: msg
      });
    }
  };

  // 7. Print Official Attendance Sheet
  const handlePrintSheet = async () => {
    if (!selectedSession) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة الكشف');
      return;
    }

    const currentCls = classesList.find(c => c.class_id === selectedClassId);
    const className = currentCls?.name || selectedSession.class_name || selectedSession.stage || 'الفصل الخدمي';

    const rowsHtml = sheetItems.map((m) => `
      <tr style="background: ${m.attended ? '#ffffff' : '#fff5f5'};">
        <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px;">${m.index}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${m.full_name}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; color: #475569;">${m.area || '—'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;" dir="ltr">${m.phone || '—'}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; color: ${m.attended ? '#15803d' : '#b91c1c'};">
          ${m.attended ? 'حاضر ✓' : 'غائب ✗'}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 11px; color: #64748b;">
          ${m.scanned_at || (m.attended ? 'تم التسجيل' : '—')}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 120px;"></td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>كشف حضور وغياب - ${className} - ${selectedSession.session_date}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          body { font-family: 'Cairo', sans-serif; padding: 25px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          .church { font-size: 17px; font-weight: 800; }
          .title { font-size: 20px; font-weight: 900; color: #1e3a8a; margin: 4px 0; }
          .meta { font-size: 13px; color: #475569; display: flex; justify-content: space-around; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px; font-weight: 800; }
          .stats-bar { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 15px; border-radius: 6px; margin-top: 15px; font-weight: 700; font-size: 13px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; font-weight: bold; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church">كنيسة الشهيد العظيم مارجرجس والأنبا شنودة بالكرور</div>
          <div class="title">كشف حضور وغياب: ${className}</div>
          <div class="meta">
            <div><strong>تاريخ الجلسة:</strong> ${selectedSession.session_date}</div>
            <div><strong>عنوان اللقاء:</strong> ${selectedSession.title}</div>
            <div><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        <div class="stats-bar">
          <div>إجمالي الفصل: ${sheetStats.total_members} مخدوم</div>
          <div style="color: #15803d;">عدد الحاضرين: ${sheetStats.present_count}</div>
          <div style="color: #b91c1c;">عدد الغائبين: ${sheetStats.absent_count}</div>
          <div>نسبة الحضور: ${sheetStats.attendance_rate}%</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">م</th>
              <th>اسم المخدوم</th>
              <th style="width: 110px;">المنطقة</th>
              <th style="width: 105px;">الهاتف</th>
              <th style="width: 75px;">الحالة</th>
              <th style="width: 80px;">وقت الحضور</th>
              <th>ملاحظات وافتقاد الخادم</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div>توقيع خادم الفصل: .........................</div>
          <div>توقيع أمين المرحلة: .........................</div>
          <div>توقيع كاهن الكنيسة: .........................</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 600);
  };

  // 8. Create New Session(s) for Selected Class(es)
  const handleCreateSession = async (e) => {
    e.preventDefault();
    const classIds = sessionFormData.selected_class_ids || [];
    if (classIds.length === 0) {
      alert('يرجى اختيار فصل واحد على الأقل لفتح جلسة الحضور');
      return;
    }

    setSessionFormLoading(true);
    try {
      const sessionDate = sessionFormData.session_date;
      const title = sessionFormData.title?.trim() || formatArabicSessionTitle(sessionDate);

      for (const classId of classIds) {
        const clsObj = classesList.find(c => c.class_id === classId);
        const stage = clsObj?.stage || clsObj?.name || 'عام';
        await attendanceApi.createSession({
          class_id: classId,
          stage: stage,
          title: title,
          session_date: sessionDate,
          recurrence: sessionFormData.recurrence || 'Weekly'
        });
      }

      setIsSessionModalOpen(false);
      const targetClassId = classIds[0];
      setSelectedClassId(targetClassId);
      await fetchSessions(targetClassId);
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إنشاء جلسات الحضور');
    } finally {
      setSessionFormLoading(false);
    }
  };

  const [closingAllSessions, setClosingAllSessions] = useState(false);

  const handleCloseAllOpenSessions = async () => {
    const classObj = classesList.find(c => c.class_id === selectedClassId);
    const confirmMsg = selectedClassId && classObj
      ? `هل أنت متأكد من رغبتك في إغلاق جميع جلسات الحضور المفتوحة لفصل "${classObj.name}"؟`
      : 'هل أنت متأكد من رغبتك في إغلاق كافة جلسات الحضور المفتوحة حالياً في النظام؟';

    if (!window.confirm(confirmMsg)) return;

    setClosingAllSessions(true);
    try {
      const res = await attendanceApi.closeAllOpenSessions(selectedClassId || null);
      if (res.success) {
        alert(res.message || 'تم إغلاق جميع الجلسات المفتوحة بنجاح');
        if (selectedClassId) {
          await fetchSessions(selectedClassId);
        } else if (classesList[0]) {
          await fetchSessions(classesList[0].class_id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'تعذر إغلاق الجلسات المفتوحة');
    } finally {
      setClosingAllSessions(false);
    }
  };

  // Filter items based on tab
  const filteredItems = sheetItems.filter(item => {
    if (filterTab === 'PRESENT') return item.attended;
    if (filterTab === 'ABSENT') return !item.attended;
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCheck size={28} style={{ color: '#38bdf8' }} />
            <span>كشف حضور وغياب الفصول</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            كشف مرقم بأسماء مخدومي الفصل، المنطقة السكنية، والتليفون مع رصد فوري للغياب والحضور بضغطة واحدة
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {hasPermission('attendance:session') && (
            <>
              <button
                onClick={() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  setSessionFormData({
                    selected_class_ids: selectedClassId ? [selectedClassId] : (classesList[0] ? [classesList[0].class_id] : []),
                    session_date: todayStr,
                    title: formatArabicSessionTitle(todayStr),
                    recurrence: 'Weekly'
                  });
                  setIsSessionModalOpen(true);
                }}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700 }}
              >
                <Plus size={16} />
                <span>فتح جلسة حضور جديدة</span>
              </button>

              <button
                onClick={handleCloseAllOpenSessions}
                disabled={closingAllSessions}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#f87171',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.08)'
                }}
                title="إغلاق جميع جلسات الحضور المفتوحة دفعة واحدة"
              >
                <Lock size={16} />
                <span>{closingAllSessions ? 'جاري الإغلاق...' : 'إغلاق كل الجلسات المفتوحة 🔒'}</span>
              </button>
            </>
          )}

          {hasPermission('attendance:scan') && (
            <button
              onClick={handleToggleScanner}
              className={`btn ${cameraActive ? 'btn-danger' : 'btn-primary'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.88rem',
                fontWeight: 800,
                background: cameraActive
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #0284c7, #0369a1)',
                boxShadow: cameraActive
                  ? '0 0 15px rgba(239, 68, 68, 0.45)'
                  : '0 4px 14px rgba(2, 132, 199, 0.4)',
                color: '#ffffff'
              }}
            >
              <Camera size={17} />
              <span>{cameraActive ? 'إيقاف كاميرا الـ QR ⏹️' : 'تشغيل كاميرا الـ QR للتحضير اللحظي 📷'}</span>
            </button>
          )}

          {hasPermission('reports:export') && (
            <button
              onClick={handlePrintSheet}
              disabled={!selectedSession || sheetItems.length === 0}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
            >
              <Printer size={16} />
              <span>طباعة الكشف (PDF)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Class & Session Selector Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          
          {/* Class Selector */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-gold)' }}>
              <Layers size={15} />
              <span>الفصل الخدمي المستهدف:</span>
            </label>
            <select
              className="form-input"
              style={{ fontWeight: 700 }}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classesList.map((cls) => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.name} ({cls.stage || 'عام'})
                </option>
              ))}
            </select>
          </div>

          {/* Session Selector */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}>
              <Calendar size={15} />
              <span>جلسة الحضور:</span>
            </label>
            <select
              className="form-input"
              style={{ fontWeight: 700 }}
              value={selectedSession?.session_id || ''}
              onChange={(e) => {
                const found = sessions.find(s => s.session_id === e.target.value);
                setSelectedSession(found);
              }}
            >
              {sessions.length === 0 ? (
                <option value="">لا توجد جلسات مفتوحة لهذا الفصل</option>
              ) : (
                sessions.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {s.title} ({s.session_date}) — [{s.status === 'Open' ? 'مفتوحة للتسجيل 🟢' : 'مغلقة 🔒'}]
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Session Status Toggle */}
          {selectedSession && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.2rem' }}>
              <span className={`badge ${selectedSession.status === 'Open' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                {selectedSession.status === 'Open' ? 'الجلسة مفتوحة للتسجيل 🔓' : 'الجلسة مغلقة 🔒'}
              </span>

              {hasPermission('attendance:session') && (
                <button
                  type="button"
                  onClick={handleToggleSessionStatus}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', gap: '4px' }}
                >
                  {selectedSession.status === 'Open' ? <Lock size={14} /> : <Unlock size={14} />}
                  <span>{selectedSession.status === 'Open' ? 'إغلاق' : 'فتح'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Selected Session KPI Summary */}
        {selectedSession && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <Users size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي مخدومي الفصل</span>
                <strong style={{ fontSize: '1.25rem', fontWeight: 800 }}>{sheetStats.total_members} مخدوم</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>الحاضرون اليوم</span>
                <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c55e' }}>{sheetStats.present_count} طفل</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <XCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>الغائبون اليوم</span>
                <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{sheetStats.absent_count} طفل</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontWeight: 900, fontSize: '0.85rem' }}>
                {sheetStats.attendance_rate}%
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>نسبة الحضور</span>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                  <div style={{ width: `${Math.min(100, sheetStats.attendance_rate)}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8 0%, #22c55e 100%)' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Live Embedded QR Scanner Hub (Front & Center) */}
      {isScannerOpen && (
        <div className="glass-card animate-scale-in" style={{
          padding: '1.25rem',
          border: '2px solid #38bdf8',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96))',
          boxShadow: '0 10px 30px rgba(56, 189, 248, 0.25)',
          borderRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#38bdf8'
              }}>
                <Camera size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
                  بوابة التحضير الفوري عبر كاميرا الـ QR
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  وجه كود المخدوم أو كارت الخدمة أمام الكاميرا — يتم تسجيل الحضور بصوت فوري وتحديث الكشف بالأسفل
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className={`badge ${cameraActive ? 'badge-success' : 'badge-warning'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                {cameraActive ? '🟢 الكاميرا تستقبل الكروت الآن' : '⏳ جاري فتح عدسة الكاميرا...'}
              </span>
              <button
                type="button"
                onClick={stopCamera}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.35)' }}
              >
                <X size={15} />
                <span>إيقاف الكاميرا</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            {/* Viewfinder Frame */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px',
              margin: '0 auto',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#020617',
              border: '2px solid rgba(56, 189, 248, 0.5)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
            }}>
              <div id={scannerContainerId} style={{ width: '100%', minHeight: '280px' }} />
            </div>

            {/* Live Feedback Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentScanResult ? (
                <div className="animate-scale-in" style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: recentScanResult.status === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  border: `2px solid ${recentScanResult.status === 'success' ? '#22c55e' : '#f59e0b'}`,
                  textAlign: 'center',
                  boxShadow: recentScanResult.status === 'success' ? '0 0 25px rgba(34, 197, 94, 0.3)' : 'none'
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>
                    {recentScanResult.status === 'success' ? '✅' : '⚠️'}
                  </div>
                  <div style={{
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: recentScanResult.status === 'success' ? '#86efac' : '#fde047',
                    marginBottom: '0.25rem'
                  }}>
                    {recentScanResult.title}
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.5rem' }}>
                    {recentScanResult.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {cooldownSeconds > 0 ? `جاهز للمسح التالي بعد ${cooldownSeconds} ثانية...` : 'جاهز لمسح كارت مخدوم آخر 📷'}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed var(--border-subtle)',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <QrCode size={40} style={{ color: '#38bdf8', opacity: 0.8, marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '0.35rem' }}>
                    جاهز لمسح الكروت تلقائياً
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: '1.5' }}>
                    ضع كود الـ QR الخاص بالتلميذ أمام الكاميرا — سيتم التعرف عليه فوراً وتسجيله كـ "حاضر" في الجدول أدناه
                  </p>
                </div>
              )}

              {/* Instant Mini Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#86efac' }}>حاضر الآن</span>
                  <strong style={{ fontSize: '1.4rem', color: '#86efac', fontWeight: 800 }}>{sheetStats.present_count}</strong>
                </div>

                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#fca5a5' }}>غائب الآن</span>
                  <strong style={{ fontSize: '1.4rem', color: '#fca5a5', fontWeight: 800 }}>{sheetStats.absent_count}</strong>
                </div>
              </div>

              {/* Manual Barcode / Member Code Input */}
              <form onSubmit={handleManualScanSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                  placeholder="أو أدخل كود الطفل (K-XXXXXX) / امسح بمسدس الباركود..."
                  value={manualScanInput}
                  onChange={(e) => setManualScanInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  disabled={!manualScanInput.trim()}
                >
                  تسجيل ✓
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. Numbered Class Attendance Sheet */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        
        {/* Controls: Search & Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          
          {/* Tabs: All / Present / Absent */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterTab('ALL')}
              className={`btn ${filterTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.84rem', padding: '0.4rem 0.9rem' }}
            >
              <span>الكل ({sheetStats.total_members})</span>
            </button>
            <button
              onClick={() => setFilterTab('PRESENT')}
              className={`btn ${filterTab === 'PRESENT' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '0.84rem',
                padding: '0.4rem 0.9rem',
                background: filterTab === 'PRESENT' ? 'rgba(34, 197, 94, 0.25)' : undefined,
                borderColor: filterTab === 'PRESENT' ? '#22c55e' : undefined,
                color: filterTab === 'PRESENT' ? '#86efac' : undefined
              }}
            >
              <span>الحاضرين فقط ({sheetStats.present_count})</span>
            </button>
            <button
              onClick={() => setFilterTab('ABSENT')}
              className={`btn ${filterTab === 'ABSENT' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '0.84rem',
                padding: '0.4rem 0.9rem',
                background: filterTab === 'ABSENT' ? 'rgba(239, 68, 68, 0.25)' : undefined,
                borderColor: filterTab === 'ABSENT' ? '#ef4444' : undefined,
                color: filterTab === 'ABSENT' ? '#fca5a5' : undefined
              }}
            >
              <span>الغائبين فقط ({sheetStats.absent_count})</span>
            </button>
          </div>

          {/* Quick Search inside sheet */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingRight: '2rem', fontSize: '0.84rem', paddingBlock: '0.4rem' }}
              placeholder="بحث في كشف الفصل..."
              value={sheetSearch}
              onChange={(e) => setSheetSearch(e.target.value)}
            />
          </div>
        </div>

        {/* The Numbered Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>م</th>
                <th>اسم المخدوم</th>
                <th>المنطقة السكنية</th>
                <th>رقم التليفون والتواصل</th>
                <th style={{ textAlign: 'center', width: '160px' }}>حالة الحضور</th>
                <th style={{ textAlign: 'center', width: '120px' }}>وقت التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {sheetLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    جاري تحميل كشف الحضور والغياب...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا يوجد مخدومين مسكنين بهذا الفصل أو يطابقون خيارات البحث.
                  </td>
                </tr>
              ) : (
                filteredItems.map((member) => (
                  <tr
                    key={member.member_id}
                    style={{
                      background: member.attended ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.03)',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    {/* 1. Serial Number */}
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-muted)' }}>
                      {member.index}
                    </td>

                    {/* 2. Member Info */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--bg-secondary)',
                          border: `2px solid ${member.attended ? '#22c55e' : '#64748b'}`,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {member.photo_url ? (
                            <img src={getPhotoUrl(member.photo_url)} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>
                              {member.full_name.charAt(0)}
                            </span>
                          )}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                            {member.full_name}
                          </div>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#38bdf8' }}>
                            {member.member_id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Area */}
                    <td>
                      {member.area ? (
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          background: 'rgba(168, 85, 247, 0.12)',
                          color: '#c084fc',
                          borderRadius: '6px',
                          border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}>
                          {member.area}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* 4. Phone & Contact */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {member.phone ? (
                          <a
                            href={`tel:${member.phone}`}
                            style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.84rem' }}
                            dir="ltr"
                          >
                            {member.phone}
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>غير مسجل</span>
                        )}

                        {member.phone && (
                          <WhatsAppButton
                            phone={member.whatsapp_phone || member.phone}
                            memberName={member.full_name}
                            memberId={member.member_id}
                            template="card"
                            variant="icon"
                          />
                        )}
                      </div>
                    </td>

                    {/* 5. 1-Click Interactive Attendance Toggle Button */}
                    <td style={{ textAlign: 'center' }}>
                      {hasAnyPermission(['attendance:scan', 'attendance:session']) ? (
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(member.member_id)}
                          disabled={togglingMemberId === member.member_id || selectedSession?.status === 'Closed'}
                          className="btn"
                          style={{
                            width: '120px',
                            padding: '0.45rem 0.6rem',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: selectedSession?.status === 'Closed' ? 'not-allowed' : 'pointer',
                            background: member.attended ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderColor: member.attended ? '#22c55e' : '#ef4444',
                            color: member.attended ? '#86efac' : '#fca5a5',
                            boxShadow: member.attended ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {member.attended ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>حاضر ✓</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} />
                              <span>غائب ✗</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.82rem',
                            background: member.attended ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: member.attended ? '#86efac' : '#fca5a5'
                          }}
                        >
                          {member.attended ? 'حاضر ✓' : 'غائب ✗'}
                        </span>
                      )}
                    </td>

                    {/* 6. Scanned At / Method */}
                    <td style={{ textAlign: 'center', fontSize: '0.78rem', color: member.attended ? '#34d399' : 'var(--text-muted)' }}>
                      {member.attended ? (
                        <div>
                          <strong style={{ display: 'block', dir: 'ltr' }}>{member.scanned_at || 'حاضر'}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{member.method === 'QR' ? '📷 ماسح' : '✍️ يدوي'}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* 5. New Session Modal */}
      {isSessionModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                فتح جلسة حضور جديدة
              </h3>
              <button onClick={() => setIsSessionModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">تاريخ الجلسة*</label>
                <input
                  type="date"
                  className="form-input"
                  value={sessionFormData.session_date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setSessionFormData({
                      ...sessionFormData,
                      session_date: newDate,
                      title: formatArabicSessionTitle(newDate)
                    });
                  }}
                  required
                />
              </div>

              <div>
                <label className="form-label">اسم وعنوان الجلسة*</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: جلسة حضور يوم السبت 29 سبتمبر 2026"
                  value={sessionFormData.title}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  يتم تسمية الجلسة تلقائياً باليوم والتاريخ، ويمكنك تعديلها كما تشاء.
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    الفصول المستهدفة للجلسة* ({sessionFormData.selected_class_ids.length} محدد)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setSessionFormData({
                        ...sessionFormData,
                        selected_class_ids: classesList.map(c => c.class_id)
                      })}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                      تحديد الكل
                    </button>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>|</span>
                    <button
                      type="button"
                      onClick={() => setSessionFormData({
                        ...sessionFormData,
                        selected_class_ids: []
                      })}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <div style={{
                  maxHeight: '170px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  {classesList.map(c => {
                    const isChecked = sessionFormData.selected_class_ids.includes(c.class_id);
                    return (
                      <label
                        key={c.class_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          background: isChecked ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: isChecked ? '#38bdf8' : 'var(--text-main)',
                          userSelect: 'none',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = sessionFormData.selected_class_ids;
                            const next = e.target.checked
                              ? [...current, c.class_id]
                              : current.filter(id => id !== c.class_id);
                            setSessionFormData({ ...sessionFormData, selected_class_ids: next });
                          }}
                          style={{ accentColor: '#38bdf8', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: isChecked ? 700 : 500 }}>{c.name}</span>
                        {c.stage && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                            ({c.stage})
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {classesList.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>
                      لا توجد فصول متاحة
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsSessionModalOpen(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sessionFormLoading || sessionFormData.selected_class_ids.length === 0}
                  className="btn btn-primary"
                >
                  {sessionFormLoading
                    ? 'جاري بدء الجلسات...'
                    : `فتح الجلسة لـ (${sessionFormData.selected_class_ids.length}) ${sessionFormData.selected_class_ids.length === 1 ? 'فصل' : 'فصول'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
