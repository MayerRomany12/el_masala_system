import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { membersApi } from '../api/members';
import { cardsApi } from '../api/cards';
import { apiClient } from '../api/client';
import { MemberCard } from '../components/MemberCard';
import { QRScanner } from '../components/QRScanner';
import {
  CreditCard,
  Search,
  RefreshCw,
  Printer,
  QrCode,
  Eye,
  User,
  X,
  Sparkles,
  AlertCircle,
  RotateCw,
  CheckCircle2
} from 'lucide-react';

const STAGE_OPTIONS = [
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
  'جامعة وخريجين',
  'خدمات خاصة'
];

export const CardManagement = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  // Page mode: 'list' or 'scan'
  const [mode, setMode] = useState('list');

  // Members list states
  const [members, setMembers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Card Modal States
  const [selectedMemberCard, setSelectedMemberCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [activeSide, setActiveSide] = useState('front'); // 'front' or 'back'

  useEffect(() => {
    apiClient.get('/classes/?status=Active&limit=50')
      .then(res => {
        const data = res?.data?.data?.items || res?.data?.items || [];
        setClasses(data);
      })
      .catch(() => setClasses([]));
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await membersApi.getMembers({
        search: searchTerm || undefined,
        class_id: selectedClassId || undefined,
        stage: selectedStage || undefined,
        status: 'Active', // Default to active members for card issuance
        page,
        limit: 20
      });
      if (res.success) {
        setMembers(res.data.items);
        setTotalItems(res.data.total);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر تحميل قائمة المخدومين');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedClassId, selectedStage, page]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Open Card Preview Modal & fetch/create QR token
  const handleOpenCard = async (member) => {
    setCardLoading(true);
    setActiveSide('front');
    try {
      const res = await cardsApi.getCardData(member.member_id);
      if (res.success) {
        setSelectedMemberCard(res.data);
      } else {
        setSelectedMemberCard(member);
      }
    } catch (err) {
      // Fallback to existing member object if error
      setSelectedMemberCard(member);
    } finally {
      setCardLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (mode === 'scan') {
    return <QRScanner onBack={() => setMode('list')} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={28} style={{ color: '#38bdf8' }} />
            <span>بطاقات العضوية و QR Code</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            إصدار ومعاينة وطباعة بطاقات العضوية بمقاس 85.6 × 54 mm (نسبة 1.585:1) مع الـ QR Token الأولي المشفر
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {hasPermission('attendance:scan') && (
            <button onClick={() => setMode('scan')} className="btn btn-primary" style={{ gap: '0.5rem' }}>
              <QrCode size={18} />
              <span>فتح ماسح الكاميرا 📷</span>
            </button>
          )}
          <button onClick={fetchMembers} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Toolbar */}
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

        {/* Dynamic Class Filter */}
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

        {/* Stage Filter */}
        <div style={{ flex: '0 1 180px' }}>
          <select
            className="form-input"
            value={selectedStage}
            onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }}
          >
            <option value="">كل المراحل</option>
            {STAGE_OPTIONS.map((stg) => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#fca5a5' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginLeft: '6px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Members List Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>رمز العضوية ID</th>
                <th>اسم الطفل المخدوم</th>
                <th>المرحلة الخدمية</th>
                <th>تليفون ولي الأمر</th>
                <th>حالة البطاقة</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    جاري تحميل المخدومين لإصدار البطاقات...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    لا يوجد مخدومين يطابقون الفلاتر الحالية.
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
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {member.full_name}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{member.stage}</div>
                      {member.group_name && <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>فصل: {member.group_name}</div>}
                    </td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)', dir: 'ltr', textAlign: 'right' }}>
                      {member.phone}
                    </td>
                    <td>
                      {member.qr_token || member.card_issued_at ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> تم الإصدار
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
                          جاهز للإصدار
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {hasPermission('cards:issue') && (
                          <button
                            onClick={() => handleOpenCard(member)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.35rem' }}
                            title="معاينة وطباعة بطاقة العضوية"
                          >
                            <Eye size={14} />
                            <span>معاينة</span>
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/members/${member.member_id}`)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.35rem' }}
                          title="عرض الملف الكامل للمخدوم"
                        >
                          <User size={14} />
                          <span>الملف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalItems > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
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

      {/* 4. Interactive Card Preview Modal */}
      {selectedMemberCard && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '520px',
            background: '#1e293b',
            boxShadow: 'var(--shadow-glow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem'
          }}>
            {/* Modal Header */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  بطاقة عضوية: {selectedMemberCard.full_name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                  رمز العضوية: {selectedMemberCard.member_id}
                </span>
              </div>
              <button onClick={() => setSelectedMemberCard(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Side Switcher (Front / Back Flip) */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', width: '100%', maxWidth: '340px' }}>
              <button
                onClick={() => setActiveSide('front')}
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.82rem',
                  background: activeSide === 'front' ? 'var(--primary-color)' : 'transparent',
                  color: activeSide === 'front' ? '#fff' : 'var(--text-muted)'
                }}
              >
                الوجه الأمامي (Front)
              </button>
              <button
                onClick={() => setActiveSide('back')}
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  fontSize: '0.82rem',
                  background: activeSide === 'back' ? 'var(--primary-color)' : 'transparent',
                  color: activeSide === 'back' ? '#fff' : 'var(--text-muted)',
                  gap: '4px'
                }}
              >
                <RotateCw size={14} />
                <span>الوجه الخلفي QR (Back)</span>
              </button>
            </div>

            {/* Card Render Container */}
            {cardLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" />
                <div style={{ marginTop: '0.5rem' }}>جاري توليد بطاقة العضوية والـ QR...</div>
              </div>
            ) : (
              <MemberCard member={selectedMemberCard} activeSide={activeSide} />
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <button onClick={() => setSelectedMemberCard(null)} className="btn btn-secondary">
                إغلاق
              </button>
              {hasPermission('reports:export') && (
                <button onClick={handlePrint} className="btn btn-primary" style={{ gap: '0.4rem' }}>
                  <Printer size={18} />
                  <span>طباعة البطاقة الحالية 🖨️</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
