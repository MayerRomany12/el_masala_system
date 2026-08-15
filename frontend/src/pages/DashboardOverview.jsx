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
  ArrowRight
} from 'lucide-react';
import churchLogo from '../assets/church_logo.png';

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
    const loadOverviewMetrics = async () => {
      try {
        const [memRes, sessRes, flwRes, bdayRes] = await Promise.allSettled([
          membersApi.getStats(),
          attendanceApi.getSessions({ limit: 10 }),
          followupApi.getTasks({ status: 'Pending', limit: 1 }),
          birthdaysApi.getBirthdays({ period: 'week' })
        ]);

        setMetrics({
          totalMembers: memRes.status === 'fulfilled' && memRes.value.success ? memRes.value.data.total_members : 0,
          activeSessions: sessRes.status === 'fulfilled' && sessRes.value.success ? sessRes.value.data.items.filter(s => s.status === 'Open').length : 0,
          pendingFollowups: flwRes.status === 'fulfilled' && flwRes.value.success ? flwRes.value.data.total : 0,
          upcomingBirthdays: bdayRes.status === 'fulfilled' && bdayRes.value.success ? bdayRes.value.data.total : 0
        });
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    loadOverviewMetrics();
  }, []);

  const stats = [
    {
      title: 'إجمالي الأطفال المخدومين',
      value: metrics.totalMembers,
      label: 'مخدوم مسجل بالنظام',
      icon: <Users color="#38bdf8" size={26} />,
      bgColor: 'rgba(56, 189, 248, 0.15)',
      onClick: () => navigate('/members')
    },
    {
      title: 'جلسات الحضور المفتوحة',
      value: metrics.activeSessions,
      label: 'جلسة تسجل الآن M5',
      icon: <UserCheck color="#34d399" size={26} />,
      bgColor: 'rgba(52, 211, 153, 0.15)',
      onClick: () => navigate('/attendance')
    },
    {
      title: 'مهام افتقاد معلقة',
      value: metrics.pendingFollowups,
      label: 'غائبين بحاجة لمتابعة M6',
      icon: <HeartHandshake color="#f87171" size={26} />,
      bgColor: 'rgba(248, 113, 113, 0.15)',
      onClick: () => navigate('/followup')
    },
    {
      title: 'أعياد ميلاد هذا الأسبوع',
      value: metrics.upcomingBirthdays,
      label: 'خلال الـ 7 أيام القادمة M8',
      icon: <Cake color="#fbbf24" size={26} />,
      bgColor: 'rgba(251, 191, 36, 0.15)',
      onClick: () => navigate('/birthdays')
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Welcome Banner */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(122, 8, 29, 0.45) 0%, rgba(26, 10, 16, 0.95) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        boxShadow: '0 10px 30px rgba(122, 8, 29, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        padding: '1.75rem 2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            position: 'relative',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            padding: '3px',
            background: 'linear-gradient(135deg, #d4af37 0%, #7a081d 100%)',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
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

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-gold-light)', fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.3rem' }}>
              <Sparkles size={18} />
              <span>مرحباً بك في لوحة تحكم خدمة مدارس الأحد</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
              أهلاً بك، {user?.full_name} 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '650px', margin: 0 }}>
              نظام المسلة المركزي — كنيسة السيدة العذراء مريم والأنبا بولا أول السواح بالمسلة (مطرانية أسوان).
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(13, 5, 8, 0.7)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
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
