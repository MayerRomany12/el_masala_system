import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';
import churchLogo from '../assets/church_logo.png';
import serviceLogo from '../assets/service_logo.png';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'خطأ في اسم المستخدم أو كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      background: 'var(--bg-main)'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2rem 1.75rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Dual Logos & Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            {/* Church Seal */}
            <div style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              border: '2px solid var(--color-primary)',
              overflow: 'hidden',
              background: 'var(--bg-secondary)',
              flexShrink: 0
            }}>
              <img
                src={churchLogo}
                alt="شعار الكنيسة"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Sunday School Service Logo */}
            <div style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              border: '2px solid var(--color-gold)',
              overflow: 'hidden',
              background: 'var(--bg-secondary)',
              flexShrink: 0
            }}>
              <img
                src={serviceLogo}
                alt="شعار مدارس الأحد"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            منظومة خدمة مدارس الأحد
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600, margin: '0 0 0.15rem' }}>
            كنيسة مارجرجس والأنبا شنودة
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            عزبة شنوده - الكرور - أسوان
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">اسم المستخدم أو البريد الإلكتروني</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingRight: '2.4rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
                autoComplete="username"
              />
              <User size={16} style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ paddingRight: '2.4rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                autoComplete="current-password"
              />
              <Lock size={16} style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
          >
            <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
            {!loading && <ArrowLeft size={16} />}
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          نظام الخدمة الداخلي المصرح به للخدام
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
