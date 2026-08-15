import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  QrCode,
  UserCheck,
  HeartHandshake,
  Gift,
  Award,
  FileBarChart,
  UserCog,
  Settings,
  Cake,
  X
} from 'lucide-react';

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { hasPermission } = useAuth();

  const navItems = [
    {
      title: 'الرئيسية والملخص',
      path: '/',
      icon: <LayoutDashboard size={19} />,
      permission: null
    },
    {
      title: 'الأعضاء والأطفال',
      path: '/members',
      icon: <Users size={19} />,
      permission: 'members:read'
    },
    {
      title: 'بطاقات العضوية و QR',
      path: '/cards',
      icon: <CreditCard size={19} />,
      permission: 'members:read'
    },
    {
      title: 'الأنشطة والرحلات',
      path: '/events',
      icon: <QrCode size={19} />,
      permission: 'events:read'
    },
    {
      title: 'تسجيل الحضور (جهاز)',
      path: '/attendance',
      icon: <UserCheck size={19} />,
      permission: 'attendance:scan'
    },
    {
      title: 'متابعة الافتقاد والغياب',
      path: '/followup',
      icon: <HeartHandshake size={19} />,
      permission: 'followup:read'
    },
    {
      title: 'المكافآت والخصومات',
      path: '/rewards',
      icon: <Award size={19} />,
      permission: 'rewards:manage'
    },
    {
      title: 'أعياد الميلاد والهدايا',
      path: '/birthdays',
      icon: <Cake size={19} />,
      permission: 'birthdays:read'
    },
    {
      title: 'إدارة المستخدمين',
      path: '/users',
      icon: <UserCog size={19} />,
      permission: 'users:read'
    },
    {
      title: 'إعدادات النظام',
      path: '/settings',
      icon: <Settings size={19} />,
      permission: 'settings:write'
    },
    {
      title: 'التقارير والإحصائيات',
      path: '/reports',
      icon: <FileBarChart size={19} />,
      permission: 'reports:export'
    }
  ];

  const handleNavClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div style={{
          fontSize: '0.82rem',
          fontWeight: 800,
          color: 'var(--color-gold-light)',
          padding: '0 0.5rem 0.75rem 0',
          borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          letterSpacing: '0.03em'
        }}>
          <span>قائمة الخدمات والأنشطة</span>
          <button
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="btn btn-secondary sidebar-close-btn"
            style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {navItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={({ isActive }) => ({
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '0.72rem 1rem',
                  fontSize: '0.88rem',
                  borderRadius: 'var(--radius-sm)',
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid transparent',
                  background: isActive ? 'linear-gradient(135deg, #7a081d 0%, #a80f2d 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 4px 15px rgba(122, 8, 29, 0.5)' : 'none',
                  fontWeight: isActive ? 800 : 600,
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                })}
              >
                {item.icon}
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
