import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, MessageSquare, Menu } from 'lucide-react';
import churchLogo from '../assets/church_logo.png';
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
    const interval = setInterval(fetchUnread, 30000); // Auto poll unread count every 30s
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
        className="glass-card navbar-header"
        style={{
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(26, 10, 16, 0.92)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.35)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Mobile Sidebar Toggle & Church Branding & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onToggleMobileSidebar}
            className="btn btn-secondary mobile-hamburger-btn"
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-gold-light)',
              borderColor: 'rgba(212, 175, 55, 0.3)'
            }}
            title="القائمة"
          >
            <Menu size={22} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              position: 'relative',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              padding: '2px',
              background: 'linear-gradient(135deg, #d4af37 0%, #7a081d 100%)',
              boxShadow: '0 0 12px rgba(212, 175, 55, 0.4)',
              flexShrink: 0
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
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-gold-light)', margin: 0, lineHeight: 1.2, textShadow: '0 2px 10px rgba(212, 175, 55, 0.3)' }}>
                نظام المسلة الكنسي
              </h2>
              <p className="navbar-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
                كنيسة السيدة العذراء مريم والأنبا بولا أول السواح بالمسلة — مطرانية أسوان
              </p>
            </div>
          </div>
        </div>

        {/* Logged in Servant User Info & Actions */}
        {user && (
          <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            
            {/* Communication Hub Notification Button */}
            <button
              onClick={() => setIsHubOpen(true)}
              className="btn btn-secondary"
              style={{
                position: 'relative',
                padding: '0.45rem 0.75rem',
                gap: '0.35rem',
                color: 'var(--color-gold-light)',
                borderColor: 'rgba(212, 175, 55, 0.4)',
                fontSize: '0.82rem'
              }}
              title="مركز التواصل والمهام الداخلي"
            >
              <MessageSquare size={17} />
              <span className="navbar-text-hide-mobile">الرسائل والمهام</span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="navbar-user-card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.35rem 0.75rem',
              background: 'rgba(59, 0, 11, 0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(212, 175, 55, 0.25)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(212, 175, 55, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-light)',
                flexShrink: 0
              }}>
                <User size={18} />
              </div>
              <div className="navbar-user-info">
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {user.full_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
                  <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
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
