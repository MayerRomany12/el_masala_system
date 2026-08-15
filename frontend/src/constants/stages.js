// Canonical Stage Codes & Dynamic Arabic Mappings
export const STAGE_OPTIONS = [
  { code: 'ALL', label: 'جميع المراحل الخدمية ⛪' },
  { code: 'NURSERY', label: 'حضانة (KG1 & KG2)' },
  { code: 'PRIMARY_1', label: 'ابتدائي - الصف الأول' },
  { code: 'PRIMARY_2', label: 'ابتدائي - الصف الثاني' },
  { code: 'PRIMARY_3', label: 'ابتدائي - الصف الثالث' },
  { code: 'PRIMARY_4', label: 'ابتدائي - الصف الرابع' },
  { code: 'PRIMARY_5', label: 'ابتدائي - الصف الخامس' },
  { code: 'PRIMARY_6', label: 'ابتدائي - الصف السادس' },
  { code: 'PREPARATORY_1', label: 'إعدادي - الصف الأول' },
  { code: 'PREPARATORY_2', label: 'إعدادي - الصف الثاني' },
  { code: 'PREPARATORY_3', label: 'إعدادي - الصف الثالث' },
  { code: 'SECONDARY', label: 'ثانوي' },
  { code: 'UNIVERSITY', label: 'جامعة وخريجين' }
];

export const getStageLabel = (stageCodeOrName) => {
  if (!stageCodeOrName) return '';
  const match = STAGE_OPTIONS.find(
    s => s.code.toLowerCase() === stageCodeOrName.toLowerCase() || s.label === stageCodeOrName
  );
  return match ? match.label : stageCodeOrName;
};
