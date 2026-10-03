import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, MessageSquare, Menu } from 'lucide-react';
import churchLogo from '../assets/church_logo.png';
import serviceLogo from '../assets/service_logo.png';
import { messagesApi } from '../api/messages';
import { CommunicationHubModal } from './CommunicationHubModal';

export const Navbar = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isHubOpen, setIsHubOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await messagesApi.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.data.unread_count);
      }
    } catch (e) {}
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Super Admin': return 'badge-superadmin';
      case 'Admin': return 'badge-admin';
      default: return 'badge-servant';
    }
  };

  return (
    <>
      <header
        className="navbar-header"
        style={{
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Mobile Hamburger & Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onToggleMobileSidebar}
            className="btn btn-secondary mobile-hamburger-btn"
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-primary-light)'
            }}
            title="القائمة"
            aria-label="القائمة الرئيسية"
          >
            <Menu size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Logos */}
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '2px solid var(--color-primary)',
                overflow: 'hidden',
                flexShrink: 0,
                zIndex: 2,
                background: 'var(--bg-secondary)'
              }}>
                <img
                  src={churchLogo}
                  alt="شعار الكنيسة"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1.5px solid var(--color-gold)',
                overflow: 'hidden',
                marginRight: '-10px',
                flexShrink: 0,
                zIndex: 1,
                background: 'var(--bg-secondary)'
              }}>
                <img
                  src={serviceLogo}
                  alt="شعار الخدمة"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            <div>
              <h2 style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
                lineHeight: 1.2
              }}>
                كنيسة مارجرجس والأنبا شنودة
              </h2>
              <p className="navbar-subtitle" style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                margin: 0,
                fontWeight: 500
              }}>
                الكرور - أسوان | خدمة مدارس الأحد
              </p>
            </div>
          </div>
        </div>

        {/* User Info & Actions */}
        {user && (
          <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Communication Hub Notification Button */}
            <button
              onClick={() => setIsHubOpen(true)}
              className="btn btn-secondary"
              style={{
                position: 'relative',
                padding: '0.4rem 0.75rem',
                fontSize: '0.82rem',
                gap: '0.35rem'
              }}
              title="الرسائل والمهام"
            >
              <MessageSquare size={16} />
              <span className="navbar-text-hide-mobile">الرسائل</span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Servant Profile Indicator */}
            <div className="navbar-user-card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.65rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold)',
                flexShrink: 0
              }}>
                <User size={16} />
              </div>
              <div className="navbar-user-info">
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                  {user.full_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '1px' }}>
                  <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{
                padding: '0.4rem 0.65rem',
                fontSize: '0.82rem',
                color: 'var(--color-danger)',
                borderColor: 'rgba(239, 68, 68, 0.25)'
              }}
              title="تسجيل الخروج"
            >
              <LogOut size={15} />
              <span className="navbar-text-hide-mobile">خروج</span>
            </button>
          </div>
        )}
      </header>

      {/* Internal Communication & Task Center Modal */}
      <CommunicationHubModal
        isOpen={isHubOpen}
        onClose={() => {
          setIsHubOpen(false);
          fetchUnread();
        }}
      />
    </>
  );
};
