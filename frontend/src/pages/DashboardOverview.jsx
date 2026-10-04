import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
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
  CheckCircle2,
  Cake,
  Award,
  CalendarCheck,
  FolderKanban,
  FileBarChart,
  BookOpen,
  ChevronLeft,
  ShieldCheck,
  ArrowLeft
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

  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [membersRes, sessionsRes, followupsRes, birthdaysRes, classesRes] = await Promise.allSettled([
          membersApi.getStats ? membersApi.getStats() : membersApi.getMembers({ limit: 1 }),
          attendanceApi.listSessions({ limit: 1 }),
          followupApi.getStats(),
          birthdaysApi.getUpcoming({ days: 30 }),
          apiClient.get('/classes/?status=Active&limit=100')
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

        if (classesRes.status === 'fulfilled') {
          const cls = classesRes.value?.data?.data?.items || classesRes.value?.data?.items || [];
          setMyClasses(cls);
        }
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
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem', fontWeight: 600 }}>الدور والمسؤولية الخدمية</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-gold-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
            <ShieldCheck size={16} style={{ color: 'var(--color-gold)' }} />
            <span>{user?.role_name || user?.role || 'خادم'}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center', marginTop: '0.2rem', fontWeight: 600 }}>
            <span>{myClasses.length} فصول مخصصة</span>
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

      {/* 2. My Assigned Classes Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderKanban size={20} style={{ color: 'var(--color-gold)' }} />
            <span>فصولي الخدمية ومجموعات مدارس الأحد</span>
            <span className="badge" style={{ background: 'rgba(212, 175, 55, 0.15)', color: 'var(--color-gold-light)', fontSize: '0.8rem', marginRight: '0.4rem' }}>
              {myClasses.length} فصول
            </span>
          </h2>

          <button
            onClick={() => navigate('/classes')}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', gap: '0.3rem' }}
          >
            <span>عرض كل الفصول</span>
            <ChevronLeft size={15} />
          </button>
        </div>

        {myClasses.length === 0 ? (
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            لا توجد فصول مخصصة لحسابك حالياً. يمكنك مراجعة أمين الخدمة أو الاطلاع على الفصول المتاحة.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {myClasses.map((cls) => (
              <div
                key={cls.class_id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  background: 'linear-gradient(145deg, rgba(26, 11, 16, 0.7) 0%, rgba(13, 5, 8, 0.9) 100%)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className="badge" style={{ background: cls.group_type === 'Summer' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(122, 8, 29, 0.3)', color: cls.group_type === 'Summer' ? '#fbbf24' : 'var(--color-gold-light)' }}>
                      {cls.group_type === 'Summer' ? 'نشاط صيفي ☀️' : 'مدارس الأحد ⛪'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {cls.class_id}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem' }}>
                    {cls.name}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-gold-light)', fontWeight: 600 }}>
                    {cls.stage} {cls.grade ? `— ${cls.grade}` : ''}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <div>
                      <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{cls.active_members_count || 0}</strong> مخدوم
                    </div>
                    <div>
                      <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>{cls.active_servants_count || 0}</strong> خدام
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <button
                    onClick={() => navigate(`/attendance?class_id=${cls.class_id}`)}
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem 0.5rem', gap: '0.3rem', justifyContent: 'center' }}
                    title="فتح كشف حضور الفصل المرقم"
                  >
                    <UserCheck size={15} />
                    <span>كشف الحضور 📋</span>
                  </button>

                  <button
                    onClick={() => navigate(`/classes/${cls.class_id}`)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                    title="قائمة المخدومين والرسائل"
                  >
                    <span>التفاصيل</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>كشف حضور الفصول ومسح QR</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/members')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-light)' }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>قائمة المخدومين</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>إضافة وتعديل بيانات الأطفال والمناطق</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/classes')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 175, 55, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>
              <FolderKanban size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>الفصول والمجموعات</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>تسكين المخدومين والخدام ورسائل الواتساب</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/reports')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>
              <FileBarChart size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>التقارير والكشوفات</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>كشوفات الحاضرين والغائبين والطباعة الرسمية</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/followup')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>
              <HeartHandshake size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>متابعة الافتقاد</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>تقسيم المناطق وافتقاد الغائبين</p>
          </div>

          <div className="glass-card" onClick={() => navigate('/birthdays')} style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ width: '44px', height: '44px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
              <Cake size={24} />
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>أعياد الميلاد</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>متابعة الهدايا والتهاني حسب الفصل</p>
          </div>
        </div>
      </div>
    </div>
  );
};
