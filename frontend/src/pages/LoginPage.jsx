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
      padding: '1.5rem',
      background: 'radial-gradient(circle at center, #0e3057 0%, #061930 50%, #020c19 100%)'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(8, 26, 49, 0.92)',
        border: '1px solid rgba(250, 204, 21, 0.35)',
        boxShadow: '0 0 45px rgba(2, 132, 199, 0.45)'
      }}>
        {/* Dual Logos & Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
            {/* Church Seal */}
            <div style={{
              position: 'relative',
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, #facc15 0%, #0284c7 100%)',
              boxShadow: '0 0 25px rgba(250, 204, 21, 0.45)',
              display: 'inline-block'
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

            {/* Sunday School Service Logo */}
            <div style={{
              position: 'relative',
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #facc15 100%)',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.45)',
              display: 'inline-block'
            }}>
              <img
                src={serviceLogo}
                alt="شعار مدارس الأحد"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>

          <h1 style={{ fontSize: '1.55rem', fontWeight: 900, color: 'var(--color-yellow-light)', marginBottom: '0.4rem', textShadow: '0 2px 10px rgba(250, 204, 21, 0.3)' }}>
            منظومة خدمة مدارس الأحد
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 700, lineHeight: 1.4, marginBottom: '0.2rem' }}>
            كنيسة الشهيد العظيم مارجرجس الروماني والأنبا شنودة رئيس المتوحدين
          </p>
          <p style={{ fontSize: '0.8rem', color: '#93c5fd', fontWeight: 600 }}>
            بعزبة شنوده - الكرور - أسوان
          </p>
          <div style={{
            margin: '0.85rem auto 0',
            width: '100px',
            height: '3px',
            background: 'linear-gradient(90deg, transparent 0%, #facc15 50%, transparent 100%)',
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
