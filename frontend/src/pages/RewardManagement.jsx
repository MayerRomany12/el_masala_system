import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { rewardsApi } from '../api/rewards';
import { membersApi } from '../api/members';
import { eventsApi } from '../api/events';
import { cardsApi } from '../api/cards';
import { CANONICAL_STAGES } from '../constants/stages';
import {
  Award,
  Trophy,
  Sparkles,
  DollarSign,
  Search,
  RefreshCw,
  Plus,
  CheckCircle,
  CreditCard,
  Percent,
  Calendar,
  User,
  Star,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  X,
  AlertCircle,
  Camera,
  QrCode,
  MinusCircle,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';

export const RewardManagement = () => {
  const { hasPermission } = useAuth();
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('');

  // QR Rewards Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanToken, setScanToken] = useState('');
  const [scannedMember, setScannedMember] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [scanActionLoading, setScanActionLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const isLockedRef = useRef(false);
  const scannerContainerId = 'reward-qr-reader-box';

  // Calculator State
  const [eventsList, setEventsList] = useState([]);
  const [calcMemberSearch, setCalcMemberSearch] = useState('');
  const [calcMembersFound, setCalcMembersFound] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);


  // Member Points Ledger Modal
  const [ledgerMember, setLedgerMember] = useState(null);
  const [ledgerData, setLedgerData] = useState({ total_points: 0, ledger: [] });

  // Audio Feedback Synthesizer
  const playAudio = (type) => {
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
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(155, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.32, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {}
  };

  // Start Camera
  const startScannerCamera = async () => {
    setCameraError('');
    setScanMessage(null);
    isLockedRef.current = false;
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId, {
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false
        });
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: (w, h) => {
            const edge = Math.floor(Math.min(w, h) * 0.85);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0
        },
        (decodedText) => {
          if (isLockedRef.current) return;
          if (!decodedText || !decodedText.trim()) return;
          isLockedRef.current = true;
          handleProcessToken(decodedText.trim());
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setCameraError('تعذر فتح الكاميرا. يرجى التأكد من السماح بالوصول للكاميرا للمتصفح.');
      setScanning(false);
    }
  };

  // Stop Camera
  const stopScannerCamera = async () => {
    isLockedRef.current = false;
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
      setScanning(false);
    }
  };

  useEffect(() => {
    if (!isScannerOpen) {
      stopScannerCamera();
    }
  }, [isScannerOpen]);

  // Process Token
  const handleProcessToken = async (rawToken) => {
    if (!rawToken) return;
    let token = rawToken.trim().replace(/^["']|["']$/g, '');
    if (token.startsWith('{') && token.endsWith('}')) {
      try {
        const parsed = JSON.parse(token);
        token = parsed.qr_token || parsed.token || parsed.member_id || token;
      } catch (e) {}
    }

    setLookupLoading(true);
    setScanMessage(null);
    try {
      const cardRes = await cardsApi.scanQRToken(token);
      if (cardRes.success && cardRes.data) {
        let currentPoints = 0;
        try {
          const ptRes = await rewardsApi.getMemberPoints(cardRes.data.member_id);
          if (ptRes.success) currentPoints = ptRes.data.total_points || 0;
        } catch (e) {}

        setScannedMember({
          ...cardRes.data,
          current_points: currentPoints,
          raw_token: token
        });
        playAudio('success');
      } else {
        setScanMessage({ type: 'error', text: 'رمز الـ QR غير مسجل في قاعدة البيانات' });
        playAudio('error');
        setTimeout(() => { isLockedRef.current = false; }, 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'تعذر التعرف على رمز الـ QR';
      setScanMessage({ type: 'error', text: msg });
      playAudio('error');
      setTimeout(() => { isLockedRef.current = false; }, 1500);
    } finally {
      setLookupLoading(false);
    }
  };

  // Apply Points (Add / Deduct)
  const handleApplyPoints = async (action) => {
    if (!scannedMember) return;
    setScanActionLoading(true);
    setScanMessage(null);
    try {
      const res = await rewardsApi.scanPoints({
        member_id: scannedMember.member_id,
        qr_token: scannedMember.raw_token,
        action: action
      });
      if (res.success) {
        playAudio('success');
        setScanMessage({
          type: 'success',
          text: action === 'add'
            ? `🎉 ${res.message} (+${res.data.points_applied} نقطة) | الرصيد المحدث: ${res.data.new_total_points} نقطة`
            : `⚠️ ${res.message} (-${res.data.points_applied} نقطة) | الرصيد المحدث: ${res.data.new_total_points} نقطة`
        });
        setScannedMember((prev) => ({
          ...prev,
          current_points: res.data.new_total_points
        }));
        fetchLeaderboard();
      }
    } catch (err) {
      playAudio('error');
      const msg = err.response?.data?.message || err.response?.data?.detail || 'فشلت العملية';
      setScanMessage({ type: 'error', text: msg });
    } finally {
      setScanActionLoading(false);
    }
  };

  // Reset Scanner
  const handleResetScanner = () => {
    setScannedMember(null);
    setScanMessage(null);
    setScanToken('');
    isLockedRef.current = false;
  };

  // Fetch Leaderboard

  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const res = await rewardsApi.getLeaderboard({ stage: selectedStage || null, limit: 15 });
      if (res.success) {
        setLeaderboard(res.data);
      }
    } catch (err) {
      // Ignore transient
    } finally {
      setLbLoading(false);
    }
  }, [selectedStage]);

  // Fetch Active Trips for Calculator
  const fetchEvents = useCallback(async () => {
    try {
      const res = await eventsApi.getEvents({ status: 'Active', limit: 20 });
      if (res.success) {
        setEventsList(res.data.items);
        if (res.data.items.length > 0 && !selectedEventId) {
          setSelectedEventId(res.data.items[0].event_id);
        }
      }
    } catch (err) {}
  }, [selectedEventId]);

  useEffect(() => {
    fetchLeaderboard();
    fetchEvents();
  }, [fetchLeaderboard, fetchEvents]);

  // Handle Search Member for Calculator
  const handleSearchCalcMember = async (val) => {
    setCalcMemberSearch(val);
    if (!val || val.trim().length < 2) {
      setCalcMembersFound([]);
      return;
    }
    try {
      const res = await membersApi.getMembers({ search: val, status: 'Active', limit: 5 });
      if (res.success) {
        setCalcMembersFound(res.data.items);
      }
    } catch (err) {
      setCalcMembersFound([]);
    }
  };

  // Run Discount Calculator
  const handleRunCalculator = async () => {
    if (!selectedMember || !selectedEventId) return;
    setCalcLoading(true);
    try {
      const res = await rewardsApi.calculateTripDiscount(selectedMember.member_id, selectedEventId);
      if (res.success) {
        setCalcResult(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر احتساب الخصم المالي');
    } finally {
      setCalcLoading(false);
    }
  };

  // Redeem Points Submit
  const handleRedeemPointsSubmit = async () => {
    if (!calcResult || calcResult.available_points < 100) return;
    const pts = Math.min(calcResult.available_points, 100); // Redeem 100 pts
    try {
      const res = await rewardsApi.redeemPoints({
        member_id: calcResult.member_id,
        event_id: calcResult.event_id,
        points_to_redeem: pts
      });
      if (res.success) {
        alert(`تم استبدال ${pts} نقطة بخصم مالي بنجاح!`);
        handleRunCalculator(); // Refresh calc
        fetchLeaderboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر استبدال النقاط');
    }
  };


  // Open Ledger Modal
  const handleOpenLedger = async (memberId) => {
    try {
      const res = await rewardsApi.getMemberPoints(memberId);
      if (res.success) {
        setLedgerData(res.data);
        setLedgerMember(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تحميل دفتر المعاملات');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={28} style={{ color: '#fbbf24' }} />
            <span>المكافآت والخصومات ونقاط الحضور</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            منح النقاط التلقائية عند الحضور، وحاسبة الخصم المالي للرحلات بناءً على نسبة الالتزام
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setIsScannerOpen(true);
              setScannedMember(null);
              setScanMessage(null);
              setScanToken('');
              setTimeout(() => {
                startScannerCamera();
              }, 100);
            }}
            className="btn btn-primary"
            style={{ gap: '0.4rem', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' }}
          >
            <Camera size={18} />
            <span>مسح QR للمكافآت والخصم 📷</span>
          </button>


          <button onClick={fetchLeaderboard} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* 2. Leaderboard Top Podium */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={24} style={{ color: '#fbbf24' }} />
            <span>لوحة متميزي الخدمة بالحضور والنقاط</span>
          </h3>

          <select
            className="form-input"
            style={{ width: '200px', fontSize: '0.85rem' }}
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            <option value="">جميع المراحل</option>
            {CANONICAL_STAGES.map((stg) => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>
        </div>


        {/* Podium Top 3 */}
        {leaderboard.length >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
            
            {/* Rank 2 - Silver */}
            <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(148, 163, 184, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(148, 163, 184, 0.3)' }}>
              <span style={{ fontSize: '1.8rem' }}>🥈</span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.3rem 0' }}>{leaderboard[1].full_name}</h4>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{leaderboard[1].stage}</span>
              <div style={{ marginTop: '0.75rem', fontSize: '1.2rem', fontWeight: 900, color: '#fbbf24' }}>{leaderboard[1].total_points} نقطة</div>
              <span style={{ fontSize: '0.78rem', color: '#34d399' }}>نسبة الحضور: {leaderboard[1].attendance_percentage}%</span>
            </div>

            {/* Rank 1 - Gold */}
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '2px solid #fbbf24', transform: 'scale(1.03)', boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)' }}>
              <span style={{ fontSize: '2.2rem' }}>👑 🥇</span>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24', margin: '0.3rem 0' }}>{leaderboard[0].full_name}</h4>
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{leaderboard[0].stage}</span>
              <div style={{ marginTop: '0.75rem', fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>{leaderboard[0].total_points} نقطة</div>
              <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700 }}>نسبة الحضور الممتازة: {leaderboard[0].attendance_percentage}%</span>
            </div>

            {/* Rank 3 - Bronze */}
            <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(217, 119, 6, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
              <span style={{ fontSize: '1.8rem' }}>🥉</span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.3rem 0' }}>{leaderboard[2].full_name}</h4>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{leaderboard[2].stage}</span>
              <div style={{ marginTop: '0.75rem', fontSize: '1.2rem', fontWeight: 900, color: '#fbbf24' }}>{leaderboard[2].total_points} نقطة</div>
              <span style={{ fontSize: '0.78rem', color: '#34d399' }}>نسبة الحضور: {leaderboard[2].attendance_percentage}%</span>
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>المركز</th>
                <th>اسم الطفل المتميز</th>
                <th>المرحلة</th>
                <th>رصيد النقاط (Balance)</th>
                <th>نسبة الحضور (آخر 8 جلسات)</th>
                <th style={{ textAlign: 'center' }}>دفتر النقاط</th>
              </tr>
            </thead>
            <tbody>
              {lbLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>جاري تحميل لوحة المتصدرين...</td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا يوجد مخدومون بالنقاط حتى الآن.</td>
                </tr>
              ) : (
                leaderboard.map((m) => (
                  <tr key={m.member_id}>
                    <td>
                      <strong style={{ fontSize: '1.05rem', color: m.rank === 1 ? '#fbbf24' : m.rank === 2 ? '#cbd5e1' : m.rank === 3 ? '#d97706' : 'var(--text-muted)' }}>
                        #{m.rank}
                      </strong>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.full_name}</td>
                    <td style={{ fontSize: '0.82rem' }}>{m.stage}</td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontWeight: 800 }}>
                        ⭐ {m.total_points} نقطة
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      {m.attendance_percentage}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenLedger(m.member_id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                      >
                        دفتر المعاملات 📜
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Trip Financial Discount Calculator */}
      <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Percent size={24} style={{ color: '#38bdf8' }} />
          <span>حاسبة وتثبيت الخصم المالي للرحلات (Financial Discount Calculator)</span>
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          استعلام نسبة الحضور وتثبيت الخصم المالي للرحلة وقت التسجيل مع التفاصيل المالية الشفافة
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
          
          {/* Member Search */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <label className="form-label">اختر الطفل المخدوم *</label>
            <input
              type="text"
              className="form-input"
              placeholder="ابحث باسم الطفل أو رمز K-XXXX..."
              value={selectedMember ? `${selectedMember.full_name} (${selectedMember.member_id})` : calcMemberSearch}
              onChange={(e) => {
                setSelectedMember(null);
                setCalcResult(null);
                handleSearchCalcMember(e.target.value);
              }}
            />

            {calcMembersFound.length > 0 && !selectedMember && (
              <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '8px', zIndex: 50, maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                {calcMembersFound.map((m) => (
                  <div
                    key={m.member_id}
                    onClick={() => {
                      setSelectedMember(m);
                      setCalcMembersFound([]);
                    }}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}
                  >
                    <strong>{m.full_name}</strong> <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>({m.member_id})</span> — {m.stage}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select Trip Event */}
          <div style={{ flex: '1 1 240px' }}>
            <label className="form-label">اختر الرحلة / الفعالية *</label>
            <select
              className="form-input"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setCalcResult(null);
              }}
            >
              {eventsList.map((e) => (
                <option key={e.event_id} value={e.event_id}>
                  {e.title} ({e.fee} جم) — [{e.event_id}]
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunCalculator}
            className="btn btn-primary"
            disabled={!selectedMember || !selectedEventId || calcLoading}
          >
            <Percent size={18} />
            <span>حساب الخصم المالي المستحق</span>
          </button>
        </div>

        {/* Calculation Result Cards */}
        {calcResult && (
          <div className="animate-fade-in" style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>الاشتراك الأساسي</span>
              <strong style={{ fontSize: '1.2rem', color: '#f8fafc' }}>{calcResult.event_fee} جم</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>خصم انتظام الحضور ({calcResult.attendance_percentage}%)</span>
              <strong style={{ fontSize: '1.2rem', color: '#34d399' }}>
                -{calcResult.attendance_discount_amount} جم ({calcResult.attendance_discount_pct}%)
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>نقاط المخدوم المتاحة</span>
              <strong style={{ fontSize: '1.2rem', color: '#fbbf24' }}>{calcResult.available_points} نقطة</strong>
            </div>

            <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
              <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'block', fontWeight: 700 }}>المبلغ الصافي المستحق النهائي (amount_due)</span>
              <strong style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399' }}>
                {calcResult.final_amount_due} جم
              </strong>
            </div>

            {calcResult.available_points >= 100 && hasPermission('rewards:manage') && (
              <div>
                <button onClick={handleRedeemPointsSubmit} className="btn btn-secondary" style={{ color: '#fbbf24', borderColor: '#fbbf24', fontSize: '0.82rem' }}>
                  استبدال 100 نقطة بخصم 25 جم 💳
                </button>
              </div>
            )}
          </div>
        )}
      </div>



      {/* 5. Points Ledger Modal */}
      {ledgerMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', background: '#1e293b', boxShadow: 'var(--shadow-glow)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  دفتر معاملات النقاط: {ledgerMember.member_name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>
                  الرصيد المتاح الحالي (Cached Balance): {ledgerMember.total_points} نقطة
                </span>
              </div>
              <button onClick={() => setLedgerMember(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {ledgerData.ledger.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  لا توجد معاملات نقاط سابقة لهذا الطفل.
                </div>
              ) : (
                ledgerData.ledger.map((l) => {
                  const isPositive = l.points > 0;

                  return (
                    <div key={l.transaction_id} style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>{l.reason}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(l.created_at).toLocaleString('ar-EG')} | بواسطة: {l.created_by_name || 'النظام التلقائي'}
                        </span>
                      </div>

                      <strong style={{ fontSize: '1.15rem', fontWeight: 900, color: isPositive ? '#34d399' : '#f87171', dir: 'ltr' }}>
                        {isPositive ? `+${l.points}` : l.points}
                      </strong>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {/* 6. Reward QR Scanner Modal */}
      {isScannerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', background: '#0f172a', border: '2px solid #38bdf8', boxShadow: '0 0 30px rgba(56, 189, 248, 0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <QrCode size={24} style={{ color: '#38bdf8' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  مسح QR للمكافآت والخصم السريع 📷
                </h3>
              </div>
              <button
                onClick={() => {
                  stopScannerCamera();
                  setIsScannerOpen(false);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Camera Scanner Viewfinder */}
              <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#020617', border: '2px dashed rgba(56, 189, 248, 0.4)', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div id={scannerContainerId} style={{ width: '100%', minHeight: '220px' }} />

                {!scanning && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.95)', zIndex: 5 }}>
                    <Camera size={44} style={{ color: '#38bdf8' }} />
                    <button type="button" onClick={startScannerCamera} className="btn btn-primary" style={{ gap: '0.4rem' }}>
                      <Camera size={16} />
                      <span>تشغيل الكاميرا للمسح</span>
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div style={{ fontSize: '0.82rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', padding: '0.5rem 0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                  {cameraError}
                </div>
              )}

              {/* Manual input fallback */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (scanToken.trim()) handleProcessToken(scanToken.trim());
                }}
                style={{ display: 'flex', gap: '0.5rem' }}
              >
                <input
                  type="text"
                  className="form-input"
                  placeholder="أو أدخل كود المخدوم / رمز الـ QR يدوياً..."
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary" disabled={lookupLoading || !scanToken.trim()}>
                  <Search size={16} />
                  <span>بحث</span>
                </button>
              </form>

              {lookupLoading && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#38bdf8', fontWeight: 700 }}>
                  <RefreshCw size={22} className="spin" style={{ display: 'inline', marginLeft: '6px' }} />
                  <span>جاري التحقق من هوية المخدوم...</span>
                </div>
              )}

              {/* Scan Message / Toast */}
              {scanMessage && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: scanMessage.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${scanMessage.type === 'success' ? '#34d399' : '#f87171'}`,
                    color: scanMessage.type === 'success' ? '#34d399' : '#fca5a5'
                  }}
                >
                  {scanMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  <span>{scanMessage.text}</span>
                </div>
              )}

              {/* Scanned Member Profile & Action Choice */}
              {scannedMember && (
                <div className="glass-card animate-fade-in" style={{ padding: '1.25rem', border: '1px solid #34d399', background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '2px solid #38bdf8', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {scannedMember.photo_url ? (
                        <img src={scannedMember.photo_url} alt={scannedMember.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={30} style={{ color: '#38bdf8' }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{scannedMember.full_name}</strong>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                        <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>{scannedMember.member_id}</span>
                        <span style={{ color: '#cbd5e1' }}>• {scannedMember.stage}</span>
                        {scannedMember.group_name && <span style={{ color: '#94a3b8' }}>({scannedMember.group_name})</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                        <Star size={16} fill="#fbbf24" />
                        <span>رصيد النقاط الحالي: {scannedMember.current_points ?? 0} نقطة</span>
                      </div>
                    </div>
                  </div>

                  {/* Add / Deduct Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleApplyPoints('add')}
                      disabled={scanActionLoading}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        border: '1px solid #34d399',
                        padding: '0.8rem 1rem',
                        fontWeight: 800,
                        gap: '0.5rem',
                        justifyContent: 'center'
                      }}
                    >
                      <PlusCircle size={20} />
                      <span>إضافة نقاط (+5 نقاط) 🟢</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPoints('deduct')}
                      disabled={scanActionLoading}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                        border: '1px solid #f87171',
                        padding: '0.8rem 1rem',
                        fontWeight: 800,
                        gap: '0.5rem',
                        justifyContent: 'center'
                      }}
                    >
                      <MinusCircle size={20} />
                      <span>خصم نقاط (-5 نقاط) 🔴</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>ℹ️ الحد اليومي الأقصى: معاملة واحدة يومياً لكل مخدوم لمنع التكرار.</span>
                    <button
                      type="button"
                      onClick={handleResetScanner}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', gap: '0.3rem' }}
                    >
                      <RefreshCw size={13} />
                      <span>مسح مخدوم آخر</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  stopScannerCamera();
                  setIsScannerOpen(false);
                }}
                className="btn btn-secondary"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

