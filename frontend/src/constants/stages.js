// Canonical Stages for Church Sunday School
export const CANONICAL_STAGES = [
  'حضانة',
  'ابتدائي',
  'إعدادي',
  'ثانوي',
  'جامعيين وخريجين'
];

export const STAGE_OPTIONS = [
  { code: 'ALL', label: 'جميع المراحل' },
  { code: 'NURSERY', label: 'حضانة' },
  { code: 'PRIMARY', label: 'ابتدائي' },
  { code: 'PREPARATORY', label: 'إعدادي' },
  { code: 'SECONDARY', label: 'ثانوي' },
  { code: 'UNIVERSITY_AND_GRADS', label: 'جامعيين وخريجين' }
];

export const GROUP_TYPES = [
  { value: 'ALL', label: 'جميع أنواع الخدمة' },
  { value: 'Regular', label: 'مدارس أحد ⛪' },
  { value: 'Summer', label: 'نشاط صيفي ☀️' },
  { value: 'General', label: 'عام 🌟' }
];

export const getStageLabel = (stageCodeOrName) => {
  if (!stageCodeOrName) return '';
  const clean = stageCodeOrName.trim();
  if (clean === 'ALL' || clean === 'الكل (ALL)' || clean === 'الكل') return 'جميع المراحل';
  if (clean === 'جامعيين' || clean === 'خريجين' || clean === 'جامعيين وخريجين') return 'جامعيين وخريجين';
  const match = STAGE_OPTIONS.find(
    s => s.code.toLowerCase() === clean.toLowerCase() || s.label === clean
  );
  return match ? match.label : clean;
};
