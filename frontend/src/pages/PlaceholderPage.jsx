import React from 'react';

export const PlaceholderPage = ({ title, milestone, description, icon }) => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
          {title}
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>

      <div className="glass-card" style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        border: '1px dashed var(--surface-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '24px',
          background: 'rgba(99, 102, 241, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary-color)'
        }}>
          {icon}
        </div>

        <div>
          <span className="badge badge-admin" style={{ marginBottom: '0.75rem' }}>
            {milestone}
          </span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            مواصفة وتصميم وحدة {title} جاهزة
          </h2>
          <p style={{ maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            تم تحديد معمارية وقواعد بيانات هذه الوحدة بالكامل وتجهيز النقاط البرمجية الخاصة بها للربط في المرحلة القادمة.
          </p>
        </div>
      </div>
    </div>
  );
};
