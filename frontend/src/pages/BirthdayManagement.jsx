import React, { useEffect, useState, useCallback } from 'react';
import { birthdaysApi } from '../api/birthdays';
import {
  Gift,
  Cake,
  Calendar,
  Search,
  RefreshCw,
  Phone,
  MessageSquare,
  CheckCircle,
  Clock,
  UserCheck,
  X,
  AlertCircle,
  Sparkles,
  FileText,
  Send,
  PartyPopper
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

export const BirthdayManagement = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Period Tab: 'today', 'week', 'month'
  const [activePeriod, setActivePeriod] = useState('today');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedGiftStatus, setSelectedGiftStatus] = useState('');

  // Metrics
  const [metrics, setMetrics] = useState({
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
    deliveredCount: 0
  });

  // Deliver Gift Modal State
  const [activeDeliverMember, setActiveDeliverMember] = useState(null);
  const [giftName, setGiftName] = useState('هدية عيد الميلاد 2026 🎁');
  const [giftNotes, setGiftNotes] = useState('');
  const [deliverLoading, setDeliverLoading] = useState(false);

  // History Modal State
  const [historyMember, setHistoryMember] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  // Fetch Birthdays
  const fetchBirthdays = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await birthdaysApi.getBirthdays({
        period: activePeriod,
        stage: selectedStage || null,
        gift_status: selectedGiftStatus || null
      });
      if (res.success) {
        setMembers(res.data.items);

        // Calc Delivered Count
        let deliv = 0;
        res.data.items.forEach(m => {
          if (m.gift_status === 'Delivered') deliv++;
        });

        setMetrics(prev => ({
          ...prev,
          deliveredCount: deliv
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر جلب أعياد الميلاد');
    } finally {
      setLoading(false);
    }
  }, [activePeriod, selectedStage, selectedGiftStatus]);

  // Quick summary counts fetch
  const fetchSummaryCounts = useCallback(async () => {
    try {
      const [todayRes, weekRes, monthRes] = await Promise.all([
        birthdaysApi.getBirthdays({ period: 'today' }),
        birthdaysApi.getBirthdays({ period: 'week' }),
        birthdaysApi.getBirthdays({ period: 'month' })
      ]);
      setMetrics(prev => ({
        ...prev,
        todayCount: todayRes.data?.total || 0,
        weekCount: weekRes.data?.total || 0,
        monthCount: monthRes.data?.total || 0
      }));
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchBirthdays();
    fetchSummaryCounts();
  }, [fetchBirthdays, fetchSummaryCounts]);

  // Submit Deliver Gift
  const handleDeliverSubmit = async (e) => {
    e.preventDefault();
    if (!activeDeliverMember) return;
    setDeliverLoading(true);
    try {
      const res = await birthdaysApi.deliverGift({
        member_id: activeDeliverMember.member_id,
        gift_name: giftName,
        notes: giftNotes
      });
      if (res.success) {
        setActiveDeliverMember(null);
        setGiftName('هدية عيد الميلاد 2026 🎁');
        setGiftNotes('');
        fetchBirthdays();
        fetchSummaryCounts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر توثيق تسليم الهدية');
    } finally {
      setDeliverLoading(false);
    }
  };

  // Open History Modal
  const handleOpenHistory = async (m) => {
    setHistoryMember(m);
    try {
      const res = await birthdaysApi.getMemberGiftHistory(m.member_id);
      if (res.success) {
        setHistoryList(res.data);
      }
    } catch (err) {
      setHistoryList([]);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cake size={28} style={{ color: '#f43f5e' }} />
            <span>نظام متابعة أعياد الميلاد وهدايا المخدومين</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            متابعة أعياد الميلاد (اليوم، الـ 7 أيام القادمة، وهذا الشهر) وتتبع تسليم الهدايا السنوية لمنع التكرار
          </p>
        </div>

        <button onClick={fetchBirthdays} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>تحديث</span>
        </button>
      </div>

      {/* 2. Metrics Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        <div
          onClick={() => setActivePeriod('today')}
          className="glass-card"
          style={{
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            border: activePeriod === 'today' ? '2px solid #f43f5e' : '1px solid var(--surface-border)'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cake size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>أعياد ميلاد اليوم 🎂</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f43f5e' }}>{metrics.todayCount}</strong>
          </div>
        </div>

        <div
          onClick={() => setActivePeriod('week')}
          className="glass-card"
          style={{
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            border: activePeriod === 'week' ? '2px solid #fbbf24' : '1px solid var(--surface-border)'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>الـ 7 أيام القادمة 🗓️</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{metrics.weekCount}</strong>
          </div>
        </div>

        <div
          onClick={() => setActivePeriod('month')}
          className="glass-card"
          style={{
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            border: activePeriod === 'month' ? '2px solid #38bdf8' : '1px solid var(--surface-border)'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PartyPopper size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>هذا الشهر 📆</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>{metrics.monthCount}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gift size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>تم تسليم الهدية 🎁</span>
            <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{metrics.deliveredCount}</strong>
          </div>
        </div>
      </div>

      {/* 3. Filters & Period Tabs */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Period Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActivePeriod('today')}
            className={`btn ${activePeriod === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem' }}
          >
            اليوم 🎂
          </button>
          <button
            onClick={() => setActivePeriod('week')}
            className={`btn ${activePeriod === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem' }}
          >
            الـ 7 أيام القادمة 🗓️
          </button>
          <button
            onClick={() => setActivePeriod('month')}
            className={`btn ${activePeriod === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.88rem' }}
          >
            هذا الشهر 📆
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-input"
            style={{ width: '180px', fontSize: '0.85rem' }}
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            {STAGE_OPTIONS.map((stg) => (
              <option key={stg} value={stg === 'ALL' ? '' : stg}>{stg}</option>
            ))}
          </select>

          <select
            className="form-input"
            style={{ width: '160px', fontSize: '0.85rem' }}
            value={selectedGiftStatus}
            onChange={(e) => setSelectedGiftStatus(e.target.value)}
          >
            <option value="">كل حالات الهدايا</option>
            <option value="Pending">لم تسلم (Pending) 🟡</option>
            <option value="Delivered">تم التسليم (Delivered) 🟢</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#fca5a5' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginLeft: '6px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Birthday Cards Grid / Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>رمز العضوية</th>
                <th>اسم الطفل</th>
                <th>المرحلة</th>
                <th>تاريخ الميلاد / العمر</th>
                <th>التهنئة المباشرة</th>
                <th>حالة هدية 2026</th>
                <th style={{ textAlign: 'center' }}>إجراءات التسليم</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>جاري استعلام قائمة أعياد الميلاد...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    لا توجد أعياد ميلاد تقع في هذه الفترة للفلاتر المحددة.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const phone = m.mobile_phone || m.parent_phone;
                  const cleanPhone = phone ? phone.replace(/\s+/g, '') : '';
                  const isDelivered = m.gift_status === 'Delivered';

                  return (
                    <tr key={m.member_id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                          {m.member_id}
                        </span>
                      </td>

                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {m.full_name}
                      </td>

                      <td style={{ fontSize: '0.82rem' }}>{m.stage}</td>

                      <td>
                        <span style={{ fontWeight: 700, color: '#f43f5e' }}>
                          🎂 {m.birthday_day}/{m.birthday_month} ({m.age} سنة)
                        </span>
                      </td>

                      {/* Phone & WhatsApp links */}
                      <td>
                        {cleanPhone ? (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <a
                              href={`tel:${cleanPhone}`}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#34d399' }}
                              title="اتصال هاتفي تهنئة"
                            >
                              <Phone size={13} />
                              <span>{cleanPhone}</span>
                            </a>
                            <a
                              href={`https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`كل سنة وانت طيب يا ${m.full_name} 🎉🎂 بمناسبة عيد ميلادك!`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#25D366' }}
                              title="إرسال تهنئة واتساب"
                            >
                              <MessageSquare size={13} />
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>لا يوجد هاتف</span>
                        )}
                      </td>

                      <td>
                        {isDelivered ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', width: 'fit-content' }}>
                              تم التسليم 🟢
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              الهدية: {m.gift_delivery_info?.gift_name}
                            </span>
                          </div>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                            لم تسلم 🟡
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          {!isDelivered && (
                            <button
                              onClick={() => setActiveDeliverMember(m)}
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', gap: '3px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                            >
                              <Gift size={14} />
                              <span>تسليم الهدية 🎁</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenHistory(m)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                            title="عرض سجل الهدايا التاريخي"
                          >
                            <span>سجل الهدايا 📜</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Deliver Gift Modal */}
      {activeDeliverMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', background: '#1e293b', boxShadow: 'var(--shadow-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Gift size={22} style={{ color: '#34d399' }} />
                <span>تسليم هدية: {activeDeliverMember.full_name}</span>
              </h3>
              <button onClick={() => setActiveDeliverMember(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleDeliverSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">اسم / نوع الهدية المسلمة *</label>
                <input
                  type="text"
                  className="form-input"
                  value={giftName}
                  onChange={(e) => setGiftName(e.target.value)}
                  placeholder="مثال: كتاب مقدس مصور + لعبة"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات التسليم (اختياري)</label>
                <input
                  type="text"
                  className="form-input"
                  value={giftNotes}
                  onChange={(e) => setGiftNotes(e.target.value)}
                  placeholder="مثال: تم التسليم بالكنيسة عقب القداس..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setActiveDeliverMember(null)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={deliverLoading}>
                  {deliverLoading ? 'جاري التوثيق...' : 'تأكيد تسليم الهدية 🎁'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. History Modal */}
      {historyMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '550px', maxHeight: '85vh', background: '#1e293b', boxShadow: 'var(--shadow-glow)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                سجل هدايا أعياد الميلاد: {historyMember.full_name}
              </h3>
              <button onClick={() => setHistoryMember(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  لا توجد سجلات هدايا أعياد ميلاد سابقة لهذا الطفل.
                </div>
              ) : (
                historyList.map((h) => (
                  <div key={h.delivery_id} style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.92rem' }}>
                        🎁 سنة {h.year}: {h.gift_name}
                      </div>
                      {h.notes && (
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                          "{h.notes}"
                        </div>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        بواسطة: {h.delivered_by_name || 'الخادم المسلم'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(h.delivered_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
