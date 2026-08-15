import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';
import churchLogo from '../assets/church_logo.png';

export const LoginPage = () => {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('AdminPassword123!');
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
      padding: '1.5rem',
      background: 'radial-gradient(circle at center, #3b000b 0%, #120509 50%, #050103 100%)'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(26, 10, 16, 0.88)',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        boxShadow: '0 0 35px rgba(122, 8, 29, 0.5)'
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            position: 'relative',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            padding: '3px',
            background: 'linear-gradient(135deg, #d4af37 0%, #7a081d 100%)',
            boxShadow: '0 0 25px rgba(212, 175, 55, 0.5)',
            display: 'inline-block',
            marginBottom: '1rem'
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
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--color-gold-light)', marginBottom: '0.3rem', textShadow: '0 2px 10px rgba(212, 175, 55, 0.3)' }}>
            نظام المسلة الكنسي
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            كنيسة السيدة العذراء مريم والأنبا بولا أول السواح بالمسلة — مطرانية أسوان
          </p>
          <div style={{
            margin: '0.85rem auto 0',
            width: '80px',
            height: '3px',
            background: 'linear-gradient(90deg, transparent 0%, #d4af37 50%, transparent 100%)',
            borderRadius: '2px'
          }} />
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-sm)',
            color: '#fca5a5',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">اسم المستخدم أو البريد الإلكتروني</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
              />
              <User size={18} style={{
                position: 'absolute',
                right: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-gold-main)'
              }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
              />
              <Lock size={18} style={{
                position: 'absolute',
                right: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-gold-main)'
              }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', fontWeight: 800 }}
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول إلى النظام 🔑'}
            {!loading && <ArrowLeft size={18} />}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(212, 175, 55, 0.15)',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-subtle)'
        }}>
          تسجيل الدخول مخصص للمخدومين والخدام المصرح لهم فقط
        </div>
      </div>
    </div>
  );
};
