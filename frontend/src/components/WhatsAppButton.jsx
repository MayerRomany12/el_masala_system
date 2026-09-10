import React, { useState } from 'react';

export function WhatsAppButton({
  phone,
  memberName,
  memberId,
  template = 'card', // 'card', 'absence', 'birthday', 'trip'
  extraData = {},
  variant = 'button', // 'button', 'icon'
  customText = ''
}) {
  const [showModal, setShowModal] = useState(false);

  const cleanPhone = (ph) => {
    if (!ph) return '';
    let p = ph.replace(/[^0-9]/g, '');
    if (p.startsWith('0')) {
      p = '20' + p.substring(1);
    }
    return p;
  };

  const getTemplateText = () => {
    if (customText) return customText;

    const church = "كنيسة السيدة العذراء مريم والأنبا بولا بالمسلة ⛪";
    
    switch (template) {
      case 'card':
        return `سلام ونعمة 👋 
بركة وتبريكات ${church}
رمز العضوية الفريد للمخدوم المبارك (${memberName}) هو: *${memberId}*.
يسعدنا تواصلكم الدائم معنا ✨`;

      case 'absence':
        return `سلام ونعمة محبة من ${church} 🕊️
نطمئن على سلامة ابنائنا المخدوم المبارك (${memberName}) بعد غيابه عن الاجتماع.
نصلي من أجل صحته وسلامة أسرته المباركة 🙏✨`;

      case 'birthday':
        return `كل سنة والمخدوم المبارك (${memberName}) طيب وبخير وصحة وسعادة 🎉🎂🥳
عيد ميلاد سعيد مع بركة ومحبة ${church} ✨🎈`;

      case 'trip':
        return `سلام ونعمة من ${church} 🚌
تأكيد حجز رحلة/نشاط (${extraData.eventTitle || 'النشاط الكنسي'}) للمخدوم المبارك (${memberName}):
- المبلغ المدفوع: *${extraData.amountPaid || 0} جنيه*
- المبلغ المتبقي المستحق: *${extraData.amountRemaining || 0} جنيه*
نتمنى لكم بركة ورعوة ممتعة 🕊️`;

      default:
        return `سلام ونعمة من ${church} 🕊️`;
    }
  };

  const handleOpenWhatsApp = () => {
    const formattedPhone = cleanPhone(phone);
    if (!formattedPhone) {
      alert("رقم الواتساب غير متوفر أو غير صالح");
      return;
    }
    const message = encodeURIComponent(getTemplateText());
    const url = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(url, '_blank');
  };

  if (!phone) return null;

  if (variant === 'icon') {
    return (
      <button
        onClick={handleOpenWhatsApp}
        title="تواصل مباشر عبر الواتساب"
        style={{
          background: '#25D366',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '34px',
          height: '34px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(37,211,102,0.4)',
          transition: 'transform 0.2s',
          margin: '0 4px'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>💬</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleOpenWhatsApp}
      style={{
        background: '#25D366',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        padding: '0.45rem 0.9rem',
        fontSize: '0.88rem',
        fontWeight: '700',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(37, 211, 102, 0.35)',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <span>💬</span>
      <span>مراسلة واتساب</span>
    </button>
  );
}
