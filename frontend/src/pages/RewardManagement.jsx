import React, { useEffect, useState, useCallback } from 'react';
import { rewardsApi } from '../api/rewards';
import { membersApi } from '../api/members';
import { eventsApi } from '../api/events';
import {
  Award,
  Trophy,
  Sparkles,
  DollarSign,
  Gift,
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
  AlertCircle
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

export const RewardManagement = () => {
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('');

  // Calculator State
  const [eventsList, setEventsList] = useState([]);
  const [calcMemberSearch, setCalcMemberSearch] = useState('');
  const [calcMembersFound, setCalcMembersFound] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Manual Award Modal
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardMemberSearch, setAwardMemberSearch] = useState('');
  const [awardMembersFound, setAwardMembersFound] = useState([]);
  const [selectedAwardMember, setSelectedAwardMember] = useState(null);
  const [awardPoints, setAwardPoints] = useState(20);
  const [awardReason, setAwardReason] = useState('مكافأة تشجيعية وتفوق بالحفظ');
  const [awardLoading, setAwardLoading] = useState(false);

  // Member Points Ledger Modal
  const [ledgerMember, setLedgerMember] = useState(null);
  const [ledgerData, setLedgerData] = useState({ total_points: 0, ledger: [] });

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

  // Search Member for Award Modal
  const handleSearchAwardMember = async (val) => {
    setAwardMemberSearch(val);
    if (!val || val.trim().length < 2) {
      setAwardMembersFound([]);
      return;
    }
    try {
      const res = await membersApi.getMembers({ search: val, status: 'Active', limit: 5 });
      if (res.success) {
        setAwardMembersFound(res.data.items);
      }
    } catch (err) {
      setAwardMembersFound([]);
    }
  };

  // Submit Award Points
  const handleAwardSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAwardMember) return;
    setAwardLoading(true);
    try {
      const res = await rewardsApi.awardPoints({
        member_id: selectedAwardMember.member_id,
        points: parseInt(awardPoints),
        reason: awardReason
      });
      if (res.success) {
        setIsAwardModalOpen(false);
        setSelectedAwardMember(null);
        setAwardMemberSearch('');
        fetchLeaderboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر منح النقاط');
    } finally {
      setAwardLoading(false);
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

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setIsAwardModalOpen(true)} className="btn btn-primary" style={{ gap: '0.4rem', background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)' }}>
            <Gift size={18} />
            <span>منح نقاط تشجيعية 🎁</span>
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
            {STAGE_OPTIONS.map((stg) => (
              <option key={stg} value={stg === 'ALL' ? '' : stg}>{stg}</option>
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

            {calcResult.available_points >= 100 && (
              <div>
                <button onClick={handleRedeemPointsSubmit} className="btn btn-secondary" style={{ color: '#fbbf24', borderColor: '#fbbf24', fontSize: '0.82rem' }}>
                  استبدال 100 نقطة بخصم 25 جم 💳
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Manual Award Modal */}
      {isAwardModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', background: '#1e293b', boxShadow: 'var(--shadow-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Gift size={22} style={{ color: '#fbbf24' }} />
                <span>منح نقاط تشجيعية للطفل</span>
              </h3>
              <button onClick={() => setIsAwardModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAwardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">ابحث عن الطفل *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="اسم الطفل أو الرمز..."
                  value={selectedAwardMember ? `${selectedAwardMember.full_name} (${selectedAwardMember.member_id})` : awardMemberSearch}
                  onChange={(e) => {
                    setSelectedAwardMember(null);
                    handleSearchAwardMember(e.target.value);
                  }}
                  required
                />

                {awardMembersFound.length > 0 && !selectedAwardMember && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '8px', zIndex: 50, maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                    {awardMembersFound.map((m) => (
                      <div
                        key={m.member_id}
                        onClick={() => {
                          setSelectedAwardMember(m);
                          setAwardMembersFound([]);
                        }}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}
                      >
                        <strong>{m.full_name}</strong> ({m.member_id})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">عدد النقاط الممنوحة *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={awardPoints}
                  onChange={(e) => setAwardPoints(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">سبب منح النقاط *</label>
                <input
                  type="text"
                  className="form-input"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  placeholder="مثال: تفوق في حفظ الألحان/القداس"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsAwardModalOpen(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={awardLoading}>
                  {awardLoading ? 'جاري المنح...' : 'تأكيد منح النقاط 🎁'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};
