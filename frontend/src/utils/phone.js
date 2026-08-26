export const normalizePhone = (phoneStr) => {
  if (!phoneStr) return '';
  const clean = String(phoneStr).trim();
  const digits = clean.replace(/\D/g, '');
  if (!digits) return clean;

  if (digits.startsWith('20') && digits.length >= 11) {
    return `+${digits}`;
  }
  if (digits.startsWith('0')) {
    return `+20${digits.slice(1)}`;
  }
  if (digits.length === 10 && ['1', '2', '3'].includes(digits[0])) {
    return `+20${digits}`;
  }
  if (clean.startsWith('+')) {
    return `+${digits}`;
  }
  return `+20${digits}`;
};

export const getWaDigits = (phoneStr) => {
  if (!phoneStr) return '';
  const digits = String(phoneStr).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return '20' + digits.slice(1);
  }
  if (!digits.startsWith('20')) {
    return '20' + digits;
  }
  return digits;
};

export const getWaUrl = (phoneStr, text = '') => {
  const waNum = getWaDigits(phoneStr);
  if (!waNum) return '#';
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${waNum}${query}`;
};
