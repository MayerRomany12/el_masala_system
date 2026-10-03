import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { membersApi } from '../api/members';
import { attendanceApi } from '../api/attendance';
import { followupApi } from '../api/followup';
import { birthdaysApi } from '../api/birthdays';
import {
  Users,
  UserCheck,
  HeartHandshake,
  Gift,
  Calendar,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Cake,
  Award,
  CalendarCheck,
  FolderKanban
} from 'lucide-react';
import churchLogo from '../assets/church_logo.png';
import serviceLogo from '../assets/service_logo.png';

export const DashboardOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    activeSessions: 0,
    pendingFollowups: 0,
    upcomingBirthdays: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [membersRes, sessionsRes, followupsRes, birthdaysRes] = await Promise.allSettled([
          membersApi.getStats ? membersApi.getStats() : membersApi.getMembers({ limit: 1 }),
          attendanceApi.listSessions({ limit: 1 }),
          followupApi.getStats(),
          birthdaysApi.getUpcoming({ days: 30 })
        ]);

        const totalM = membersRes.status === 'fulfilled'
          ? (membersRes.value?.data?.total || membersRes.value?.total || membersRes.value?.data?.items?.length || 0)
          : 0;

        setMetrics({
          totalMembers: totalM,
          activeSessions: sessionsRes.status === 'fulfilled' ? (sessionsRes.value?.data?.length || 0) : 0,
          pendingFollowups: followupsRes.status === 'fulfilled' ? (followupsRes.value?.data?.total_open || 0) : 0,
          upcomingBirthdays: birthdaysRes.status === 'fulfilled' ? (birthdaysRes.value?.data?.length || 0) : 0
        });
      } catch (err) {
        console.error("Failed to load dashboard overview data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const stats = [
    {
      title: 'إجمالي المخدومين',
      value: metrics.totalMembers,
      icon: <Users size={22} />,
      iconColor: 'var(--color-primary-light)',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      link: '/members',
      desc: 'سجلات المخدومين بكافة الفصول'
    },
    {
      title: 'جلسات الحضور',
      value: metrics.activeSessions,
      icon: <CalendarCheck size={22} />,
      iconColor: 'var(--color-success)',
      bgColor: 'rgba(52, 211, 153, 0.12)',
      link: '/attendance',
      desc: 'الجلسات المسجلة حديثاً'
    },
    {
      title: 'مهام افتقاد مفتوحة',
      value: metrics.pendingFollowups,
      icon: <HeartHandshake size={22} />,
      iconColor: 'var(--color-gold)',
      bgColor: 'rgba(212, 175, 55, 0.12)',
      link: '/followup',
      desc: 'حالات تحتاج متابعة وافتقاد'
    },
    {
      title: 'أعياد ميلاد قادمة',
      value: metrics.upcomingBirthdays,
      icon: <Gift size={22} />,
      iconColor: '#f472b6',
      bgColor: 'rgba(244, 114, 182, 0.12)',
      link: '/birthdays',
      desc: 'خلال 30 يوماً القادمة'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
      
      {/* Welcome Church Header Banner */}
      <div className="glass-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Dual Logos */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '2px solid var(--color-primary)',
              overflow: 'hidden',
              zIndex: 2,
              background: 'var(--bg-secondary)',
              flexShrink: 0
            }}>
              <img
                src={churchLogo}
                alt="شعار الكنيسة"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              border: '1.5px solid var(--color-gold)',
              overflow: 'hidden',
              marginRight: '-14px',
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
              <span>منظومة خدمة مدارس الأحد</span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
              أهلاً بك، {user?.full_name}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
              كنيسة مارجرجس والأنبا شنودة — عزبة شنوده بالكرور (أسوان)
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1.25rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem', fontWeight: 600 }}>معرف المخدوم الدائم</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary-light)', letterSpacing: '1px', fontFamily: 'monospace' }}>
            MEM-XXXXXX
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center', marginTop: '0.2rem', fontWeight: 600 }}>
            <CheckCircle2 size={13} />
            <span>كود مشفر ثابت</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="glass-card stat-card"
            onClick={() => navigate(stat.link)}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon-box" style={{ background: stat.bgColor, color: stat.iconColor }}>
              {stat.icon}
            </div>
            <div>
              <div className="stat-value">{loading ? '...' : stat.value}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{stat.title}</div>
              <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Tiles */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} style={{ color: 'var(--color-gold)' }} />
          <span>الوصول السريع للخدمات</span>
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(52, 211, 153, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
              <UserCheck size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>تسجيل الحضور</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>مسح باركود الـ QR والبطاقات</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/members')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-light)' }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>قائمة المخدومين</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>إضافة وتعديل بيانات الأطفال</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/classes')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 175, 55, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>
              <FolderKanban size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>الفصول والمجموعات</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>توزيع الفصول والخدام المشرفين</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/cards')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <CreditCard size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>طباعة البطاقات</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>تصدير وطباعة بطاقات الـ QR</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/followup')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>
              <HeartHandshake size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>متابعة الافتقاد</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>متابعة الغياب والاتصالات</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/birthdays')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
              <Cake size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>أعياد الميلاد</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>متابعة الهدايا والتهاني</p>
          </div>
        </div>
      </div>
    </div>
  );
};
