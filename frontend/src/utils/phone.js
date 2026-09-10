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

export const isValidWhatsappNumber = (phoneStr) => {
  if (!phoneStr) return true;
  const digits = String(phoneStr).replace(/\D/g, '');
  if (!digits) return true;
  if (digits.length < 8 || digits.length > 15) return false;
  if (digits.startsWith('0')) {
    return digits.length === 11 && ['10', '11', '12', '15'].includes(digits.slice(1, 3));
  }
  if (digits.startsWith('20')) {
    if (digits.length === 12) {
      return ['10', '11', '12', '15'].includes(digits.slice(2, 4));
    }
    return digits.length >= 11;
  }
  if (digits.length === 10 && ['10', '11', '12', '15'].includes(digits.slice(0, 2))) {
    return true;
  }
  return digits.length >= 9;
};
