export const convertArabicDigits = (str) => {
  if (!str) return '';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const englishDigits = '0123456789';
  return String(str).replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => englishDigits[arabicDigits.indexOf(d)]);
};

export const normalizePhone = (phoneStr) => {
  if (!phoneStr) return '';
  const clean = convertArabicDigits(phoneStr).trim();
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

export const isValidEgyptianMobile = (phoneStr) => {
  if (!phoneStr) return false;
  const clean = convertArabicDigits(phoneStr).trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return digits.length === 11 && ['10', '11', '12', '15'].includes(digits.slice(1, 3));
  }
  if (digits.startsWith('20')) {
    return digits.length === 12 && ['10', '11', '12', '15'].includes(digits.slice(2, 4));
  }
  if (digits.length === 10 && ['10', '11', '12', '15'].includes(digits.slice(0, 2))) {
    return true;
  }
  return false;
};

export const isValidFullName = (nameStr) => {
  if (!nameStr) return false;
  const clean = String(nameStr).trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  if (/\d/.test(clean)) return false;
  return true;
};

export const getWaDigits = (phoneStr) => {
  if (!phoneStr) return '';
  const clean = convertArabicDigits(phoneStr);
  const digits = String(clean).replace(/\D/g, '');
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
  return isValidEgyptianMobile(phoneStr);
};
