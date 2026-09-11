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
  QrCode,
  CreditCard,
  CheckCircle2,
  Cake,
  Award,
  Settings,
  ArrowRight,
  CalendarCheck
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
          membersApi.getAll({ limit: 1 }),
          attendanceApi.listSessions({ limit: 1 }),
          followupApi.getStats(),
          birthdaysApi.getUpcoming({ days: 30 })
        ]);

        setMetrics({
          totalMembers: membersRes.status === 'fulfilled' ? (membersRes.value.total || 0) : 0,
          activeSessions: sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data?.length || 0) : 0,
          pendingFollowups: followupsRes.status === 'fulfilled' ? (followupsRes.value.data?.total_open || 0) : 0,
          upcomingBirthdays: birthdaysRes.status === 'fulfilled' ? (birthdaysRes.value.data?.length || 0) : 0
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
      title: 'إجمالي المخدومين المسجلين',
      value: metrics.totalMembers,
      icon: <Users size={24} color="#38bdf8" />,
      link: '/members',
      desc: 'سجلات المخدومين بكافة الفصول'
    },
    {
      title: 'جلسات الحضور النشطة',
      value: metrics.activeSessions,
      icon: <CalendarCheck size={24} color="#34d399" />,
      link: '/attendance',
      desc: 'الجلسات المسجلة حديثاً'
    },
    {
      title: 'مهام افتقاد مفتوحة',
      value: metrics.pendingFollowups,
      icon: <HeartHandshake size={24} color="#facc15" />,
      link: '/followup',
      desc: 'حالات غياب تحتاج متابعة ورعاية'
    },
    {
      title: 'أعياد ميلاد قادمة (30 يوم)',
      value: metrics.upcomingBirthdays,
      icon: <Gift size={24} color="#f472b6" />,
      link: '/birthdays',
      desc: 'فرص مباركة وتكريم المخدومين'
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Church Header Banner */}
      <div className="glass-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        background: 'linear-gradient(135deg, rgba(8, 28, 54, 0.9) 0%, rgba(4, 15, 30, 0.95) 100%)',
        border: '1px solid rgba(250, 204, 21, 0.3)',
        boxShadow: '0 10px 30px rgba(2, 132, 199, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Dual Logos */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              position: 'relative',
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, #facc15 0%, #0284c7 100%)',
              boxShadow: '0 0 20px rgba(250, 204, 21, 0.45)',
              zIndex: 2
            }}>
              <img
                src={churchLogo}
                alt="شعار الكنيسة"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            </div>
            <div style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: '2px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #facc15 100%)',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
              marginRight: '-18px',
              zIndex: 1
            }}>
              <img
                src={serviceLogo}
                alt="شعار الخدمة"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-yellow-light)', fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              <Sparkles size={18} />
              <span>مرحباً بك في منظومة خدمة مدارس الأحد</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
              أهلاً بك، {user?.full_name} 👋
            </h1>
            <p style={{ color: '#93c5fd', fontSize: '0.9rem', maxWidth: '680px', margin: 0, fontWeight: 600 }}>
              كنيسة الشهيد العظيم مارجرجس الروماني والأنبا شنودة رئيس المتوحدين — عزبة شنوده بالكرور (أسوان).
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(6, 20, 38, 0.85)',
          border: '1px solid rgba(250, 204, 21, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-light)', marginBottom: '0.2rem', fontWeight: 700 }}>صيغة معرف الطفل المعتمد</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '1px', fontFamily: 'monospace' }}>
            K-XXXXXX
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center', marginTop: '0.25rem', fontWeight: 700 }}>
            <CheckCircle2 size={14} />
            <span>Member ID ثابت ودائم</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="glass-card stat-card"
            onClick={stat.onClick}
            style={{ cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
          >
            <div className="stat-icon-box" style={{ background: stat.bgColor }}>
              {stat.icon}
            </div>
            <div>
              <div className="stat-value">{loading ? '...' : stat.value}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{stat.title}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Tiles */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-gold-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} style={{ color: '#d4af37' }} />
          <span>وصول سريع لأقسام الخدمة الرئيسية</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          
          <div className="glass-card" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <UserCheck color="#34d399" size={34} style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-main)' }}>تسجيل حضور الجلسات</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>المسح المصرح M5 وقارئ البطاقات</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/members')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <Users color="#38bdf8" size={34} style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-main)' }}>إدارة الأطفال والمخدومين</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إضافة وتعديل بيانات الأطفال K-ID</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/cards')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <CreditCard color="#fbbf24" size={34} style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-main)' }}>طباعة البطاقات والـ QR</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>قالب 1.585:1 بمقاسات الكنيسة الرسمية</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/followup')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <HeartHandshake color="#f87171" size={34} style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-main)' }}>متابعة الافتقاد والغياب</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>كاشف الغائبين وتوثيق المكالمات M6</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/rewards')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <Award color="#fbbf24" size={34} style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-main)' }}>المكافآت والخصومات</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>نقاط الحضور وحاسبة خصم الرحلات M7</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/birthdays')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <Cake color="#f43f5e" size={34} style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-main)' }}>أعياد الميلاد والهدايا</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تهنئة الأطفال وتتبع تسليم الهدايا M8</p>
          </div>
        </div>
      </div>
    </div>
  );
};
