import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  Users,
  UserCheck,
  HeartHandshake,
  Gift,
  Calendar,
  Sparkles,
  CheckCircle2,
  Cake,
  Award,
  CalendarCheck,
  FolderKanban,
  FileBarChart,
  ChevronLeft,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  GraduationCap,
  Clock,
  ExternalLink,
  Crown
} from 'lucide-react';
import churchLogo from '../assets/church_logo.png';
import serviceLogo from '../assets/service_logo.png';
import { WhatsAppButton } from '../components/WhatsAppButton';

export const DashboardOverview = () => {
  const { user, hasPermission, hasAnyPermission } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      total_members: 0,
      total_classes: 0,
      total_servants: 0,
      total_sessions: 0,
      active_sessions: 0,
      pending_followups: 0,
      escalated_followups: 0,
      total_points: 0,
      recent_attendance_rate: 0,
      upcoming_birthdays_count: 0
    },
    stages_breakdown: [],
    recent_sessions: [],
    urgent_cases: [],
    upcoming_birthdays: [],
    top_classes: []
  });

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.get('/reports/dashboard-stats');
      if (res.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const { kpis, stages_breakdown, recent_sessions, urgent_cases, upcoming_birthdays, top_classes } = dashboardData;

  const kpiCards = [
    {
      id: 'members',
      title: 'إجمالي المخدومين المقيدين',
      value: kpis.total_members,
      icon: <Users size={22} />,
      iconColor: 'var(--color-primary-light)',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      borderColor: 'rgba(56, 189, 248, 0.25)',
      link: '/members',
      badge: 'سجلات المخدومين'
    },
    {
      id: 'attendance_rate',
      title: 'متوسط نسبة الحضور',
      value: `${kpis.recent_attendance_rate || 0}%`,
      icon: <UserCheck size={22} />,
      iconColor: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.12)',
      borderColor: 'rgba(52, 211, 153, 0.25)',
      link: '/attendance',
      badge: `${kpis.active_sessions || 0} جلسات مفتوحة`
    },
    {
      id: 'classes',
      title: 'فصول الخدمة النشطة',
      value: kpis.total_classes,
      icon: <FolderKanban size={22} />,
      iconColor: 'var(--color-gold)',
      bgColor: 'rgba(212, 175, 55, 0.12)',
      borderColor: 'rgba(212, 175, 55, 0.25)',
      link: '/classes',
      badge: 'مدارس أحد وأنشطة'
    },
    {
      id: 'servants',
      title: 'خدام الكنيسة النشطين',
      value: kpis.total_servants,
      icon: <GraduationCap size={22} />,
      iconColor: '#a78bfa',
      bgColor: 'rgba(167, 139, 250, 0.12)',
      borderColor: 'rgba(167, 139, 250, 0.25)',
      link: '/users',
      badge: 'خدام ومسؤولي فصول'
    },
    {
      id: 'followups',
      title: 'حالات غياب قيد الافتقاد',
      value: kpis.pending_followups,
      icon: <HeartHandshake size={22} />,
      iconColor: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.12)',
      borderColor: 'rgba(251, 191, 36, 0.25)',
      link: '/followup',
      badge: 'غياب 1-2 أسبوع'
    },
    {
      id: 'escalated',
      title: 'غياب 3+ (موجّه لأمين الفصل)',
      value: kpis.escalated_followups,
      icon: <AlertTriangle size={22} />,
      iconColor: '#f87171',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      link: '/followup?priority=Urgent',
      badge: 'متابعة خاصة وعاجلة'
    },
    {
      id: 'birthdays',
      title: 'أعياد ميلاد هذا الأسبوع',
      value: kpis.upcoming_birthdays_count,
      icon: <Cake size={22} />,
      iconColor: '#f472b6',
      bgColor: 'rgba(244, 114, 182, 0.12)',
      borderColor: 'rgba(244, 114, 182, 0.25)',
      link: '/birthdays',
      badge: 'الـ 7 أيام القادمة'
    },
    {
      id: 'points',
      title: 'مجموع نقاط المكافآت الممنوحة',
      value: kpis.total_points,
      icon: <Award size={22} />,
      iconColor: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      borderColor: 'rgba(56, 189, 248, 0.25)',
      link: '/rewards',
      badge: 'رصيد التميز والتشجيع'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', paddingBottom: '3rem' }}>
      
      {/* ─── 1. Welcome Header Banner ────────────────────────────────────────── */}
      <div className="glass-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        padding: '1.5rem',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        background: 'linear-gradient(135deg, rgba(26, 11, 16, 0.85) 0%, rgba(13, 5, 8, 0.95) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Dual Logos */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '2px solid var(--color-gold)',
              overflow: 'hidden',
              zIndex: 2,
              background: 'var(--bg-secondary)',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
            }}>
              <img
                src={churchLogo}
                alt="شعار الكنيسة"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '1.5px solid #38bdf8',
              overflow: 'hidden',
              marginRight: '-15px',
              zIndex: 1,
              background: 'var(--bg-secondary)',
              flexShrink: 0
            }}>
              <img
                src={serviceLogo}
                alt="شعار الخدمة"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem' }}>
              <Sparkles size={16} />
              <span>منظومة خدمة مدارس الأحد والتربية الكنسية</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
              أهلاً بك، {user?.full_name}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
              كنيسة الشهيد العظيم مارجرجس والأنبا شنودة — بالكرور (أسوان) — موسم 2026/2027
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.15rem', fontWeight: 600 }}>
              المسؤولية الخدمية
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-gold)' }} />
              <span>{user?.role_name || user?.role || 'خادم'}</span>
            </div>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 0.85rem', fontSize: '0.82rem', gap: '0.4rem' }}
            title="تحديث البيانات لحظياً"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'تحديث...' : 'تحديث حي'}</span>
          </button>
        </div>
      </div>

      {/* ─── 2. KPI Cards Grid ──────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {kpiCards.map((card) => (
          <div
            key={card.id}
            className="glass-card"
            onClick={() => navigate(card.link)}
            style={{
              padding: '1.15rem',
              cursor: 'pointer',
              border: `1px solid ${card.borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-sm)',
                background: card.bgColor,
                color: card.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {card.icon}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {card.badge}
              </span>
            </div>

            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: '1.1' }}>
                {loading ? '...' : card.value}
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {card.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 3. Stage Distribution & Urgent Cases (2-Column Grid) ────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Stage Distribution Box */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} style={{ color: 'var(--color-gold)' }} />
              <span>توزيع المخدومين حسب المراحل الدراسية</span>
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>
              {kpis.total_members} مخدوم
            </span>
          </div>

          {stages_breakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              لا توجد بيانات مراحل مسجلة حالياً
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {stages_breakdown.map((stg) => (
                <div key={stg.stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{stg.stage}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--color-gold-light)' }}>{stg.count}</strong> مخدوم ({stg.percentage}%)
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: 'var(--bg-secondary)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(100, stg.percentage)}%`,
                      height: '100%',
                      borderRadius: '4px',
                      background: 'linear-gradient(90deg, var(--color-primary), var(--color-gold))',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Followup Alert Box */}
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              <span>تنبيهات الغياب المتكرر 3+ (موجّه للأمين)</span>
            </h2>
            <button
              onClick={() => navigate('/followup')}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
            >
              عرض الكل
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.85rem', lineHeight: '1.4' }}>
            حالات الغياب المتصل لمدة 3 أسابيع فأكثر تُحال تلقائياً لأمين الفصل للمتابعة والافتقاد الشخصي:
          </p>

          {urgent_cases.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#86efac',
              background: 'rgba(34, 197, 94, 0.08)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem'
            }}>
              ✓ لا توجد حالات غياب متكرر حرجة (3 مرات متتالية) حالياً. الخدمة تسير بانتظام ممتاز!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {urgent_cases.map((uc) => (
                <div
                  key={uc.task_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      {uc.member_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '2px' }}>
                      غائب منذ: <strong style={{ color: '#f87171' }}>{uc.consecutive_weeks} أسابيع متتالية</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {uc.phone && (
                      <WhatsAppButton
                        phoneNumber={uc.phone}
                        messageText={`سلام ونعمة من كنيسة مارجرجس والأنبا شنودة بالكرور، وحشتنا جداً يا ${uc.member_name} في مدارس الأحد وبنطمن عليك.`}
                        size="sm"
                      />
                    )}
                    <button
                      onClick={() => navigate(`/followup?search=${encodeURIComponent(uc.member_name)}`)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: 'var(--color-gold)' }}
                      title="توثيق الافتقاد"
                    >
                      افتقاد 📝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. Active Classes & Recent Attendance Activity (2-Column Grid) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Classes Overview Box */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderKanban size={18} style={{ color: 'var(--color-gold)' }} />
              <span>فصول الخدمة وأمناء الفصول</span>
            </h2>
            <button
              onClick={() => navigate('/classes')}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
            >
              كل الفصول ({kpis.total_classes})
            </button>
          </div>

          {top_classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              لا توجد فصول مضافة بعد. يمكنك إضافة فصول الخدمة الآن.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {top_classes.map((cls) => (
                <div
                  key={cls.class_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                      {cls.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span>المرحلة: <strong style={{ color: 'var(--text-main)' }}>{cls.stage || 'عام'}</strong></span>
                      <span>👑 أمين الفصل: <strong style={{ color: 'var(--color-gold)' }}>{cls.lead_servant}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>
                      {cls.members_count} مخدوم
                    </span>
                    <button
                      onClick={() => navigate(`/attendance?class_id=${cls.class_id}`)}
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
                      title="فتح كشف حضور الفصل"
                    >
                      <UserCheck size={13} />
                      <span>الكشف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance Sessions Box */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={18} style={{ color: 'var(--color-success)' }} />
              <span>آخر جلسات الحضور والانتظام</span>
            </h2>
            <button
              onClick={() => navigate('/attendance')}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
            >
              إدارة الجلسات
            </button>
          </div>

          {recent_sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              لا توجد جلسات حضور مسجلة حتى الآن.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recent_sessions.map((ses) => (
                <div
                  key={ses.session_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      {ses.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span>{ses.session_date}</span>
                      <span>• {ses.class_name}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <span
                      className="badge"
                      style={{
                        background: ses.attendance_rate >= 80 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                        color: ses.attendance_rate >= 80 ? '#34d399' : '#fbbf24',
                        fontWeight: 800,
                        fontSize: '0.8rem'
                      }}
                    >
                      {ses.attended_count} حاضر ({ses.attendance_rate}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. Upcoming Birthdays (This Week) ─────────────────────────────────── */}
      {upcoming_birthdays.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cake size={18} style={{ color: '#f472b6' }} />
              <span>أعياد ميلاد المخدومين خلال هذا الأسبوع 🎂</span>
            </h2>
            <button
              onClick={() => navigate('/birthdays')}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
            >
              عرض جدول أعياد الميلاد
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            {upcoming_birthdays.map((b) => (
              <div
                key={b.member_id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(244, 114, 182, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    {b.full_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {b.stage} • {b.birthday_str}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="badge" style={{ background: 'rgba(244, 114, 182, 0.15)', color: '#f472b6', fontSize: '0.72rem', fontWeight: 700 }}>
                    {b.days_remaining === 0 ? 'اليوم 🎉' : `بعد ${b.days_remaining} يوم`}
                  </span>
                  {b.phone && (
                    <WhatsAppButton
                      phoneNumber={b.phone}
                      messageText={`كل سنة وأنت طيب وبخير يا ${b.full_name} وعيد ميلاد سعيد عليك وعلى أسرتك الكريمة 🎂🎁 كنيسة مارجرجس والأنبا شنودة بالكرور`}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 6. Quick Action Navigation Tiles ─────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} style={{ color: 'var(--color-gold)' }} />
          <span>الوصول السريع لخدمات المنظومة</span>
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
          {hasAnyPermission(['attendance:scan', 'attendance:session']) && (
            <div className="glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(52, 211, 153, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                <UserCheck size={24} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>تسجيل الحضور</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>كشف حضور الفصول ومسح QR</p>
            </div>
          )}

          {hasPermission('members:read') && (
            <div className="glass-card" onClick={() => navigate('/members')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-light)' }}>
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>قائمة المخدومين</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>إضافة وتعديل بيانات الأطفال والمناطق</p>
            </div>
          )}

          {hasPermission('classes:read') && (
            <div className="glass-card" onClick={() => navigate('/classes')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 175, 55, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>
                <FolderKanban size={24} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>الفصول والمجموعات</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>تسكين المخدومين والخدام ورسائل الواتساب</p>
            </div>
          )}

          {hasPermission('reports:read') && (
            <div className="glass-card" onClick={() => navigate('/reports')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>
                <FileBarChart size={24} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>التقارير والكشوفات</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>كشوفات الحاضرين والغائبين والطباعة الرسمية</p>
            </div>
          )}

          {hasPermission('followup:read') && (
            <div className="glass-card" onClick={() => navigate('/followup')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>
                <HeartHandshake size={24} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>متابعة الافتقاد</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>تقسيم المناطق وافتقاد الغائبين</p>
            </div>
          )}

          {hasPermission('birthdays:read') && (
            <div className="glass-card" onClick={() => navigate('/birthdays')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
                <Cake size={24} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>أعياد الميلاد</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>متابعة الهدايا والتهاني حسب الفصل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
