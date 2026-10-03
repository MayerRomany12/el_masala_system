import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  FolderKanban,
  QrCode,
  UserCheck,
  HeartHandshake,
  Award,
  FileBarChart,
  UserCog,
  Settings,
  Cake,
  X
} from 'lucide-react';

const navGroups = [
  {
    label: 'القائمة',
    items: [
      { title: 'الرئيسية', path: '/', icon: <LayoutDashboard size={18} />, permission: null }
    ]
  },
  {
    label: 'الأعضاء',
    items: [
      { title: 'المخدومين', path: '/members', icon: <Users size={18} />, permission: 'members:read' },
      { title: 'البطاقات و QR', path: '/cards', icon: <CreditCard size={18} />, permission: 'members:read' },
      { title: 'أعياد الميلاد', path: '/birthdays', icon: <Cake size={18} />, permission: 'birthdays:read' }
    ]
  },
  {
    label: 'الخدمة',
    items: [
      { title: 'الفصول والمجموعات', path: '/classes', icon: <FolderKanban size={18} />, permission: 'classes:manage' },
      { title: 'النشاط الصيفي', path: '/summer-activities', icon: <Calendar size={18} />, permission: 'classes:manage' },
      { title: 'الأنشطة والرحلات', path: '/events', icon: <QrCode size={18} />, permission: 'events:read' }
    ]
  },
  {
    label: 'الحضور والمتابعة',
    items: [
      { title: 'تسجيل الحضور', path: '/attendance', icon: <UserCheck size={18} />, permission: 'attendance:scan' },
      { title: 'الافتقاد والغياب', path: '/followup', icon: <HeartHandshake size={18} />, permission: 'followup:read' },
      { title: 'المكافآت', path: '/rewards', icon: <Award size={18} />, permission: 'rewards:manage' }
    ]
  },
  {
    label: 'النظام',
    items: [
      { title: 'المستخدمين', path: '/users', icon: <UserCog size={18} />, permission: 'users:read' },
      { title: 'الإعدادات', path: '/settings', icon: <Settings size={18} />, permission: 'settings:write' },
      { title: 'التقارير', path: '/reports', icon: <FileBarChart size={18} />, permission: 'reports:export' }
    ]
  }
];

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { hasPermission } = useAuth();

  const handleNavClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Mobile Close Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.5rem 0.5rem',
          borderBottom: '1px solid var(--surface-border)',
          marginBottom: '0.5rem'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            نظام المسلة
          </span>
          <button
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="btn btn-secondary sidebar-close-btn"
            style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              item => !item.permission || hasPermission(item.permission)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                <div className="sidebar-group-title">{group.label}</div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    end={item.path === '/'}
                    className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={({ isActive }) => ({
                      justifyContent: 'flex-start',
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.84rem',
                      borderRadius: 'var(--radius-sm)',
                      border: isActive ? '1px solid rgba(59, 158, 222, 0.3)' : '1px solid transparent',
                      background: isActive ? 'var(--color-blue-main)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: isActive ? 700 : 500,
                      marginBottom: '2px'
                    })}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
