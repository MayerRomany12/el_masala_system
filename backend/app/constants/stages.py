# Canonical Stage Codes and Arabic Translations
from typing import Dict, List, Any

CANONICAL_STAGES: Dict[str, str] = {
    "NURSERY": "حضانة (KG1 & KG2)",
    "PRIMARY_1": "ابتدائي - الصف الأول",
    "PRIMARY_2": "ابتدائي - الصف الثاني",
    "PRIMARY_3": "ابتدائي - الصف الثالث",
    "PRIMARY_4": "ابتدائي - الصف الرابع",
    "PRIMARY_5": "ابتدائي - الصف الخامس",
    "PRIMARY_6": "ابتدائي - الصف السادس",
    "PREPARATORY_1": "إعدادي - الصف الأول",
    "PREPARATORY_2": "إعدادي - الصف الثاني",
    "PREPARATORY_3": "إعدادي - الصف الثالث",
    "SECONDARY": "ثانوي",
    "UNIVERSITY": "جامعة وخريجين",
    "ALL": "جميع المراحل"
}


def get_stage_label(code: str) -> str:
    if not code:
        return ""
    return CANONICAL_STAGES.get(code.strip().upper(), code)


def get_all_stages() -> List[Dict[str, str]]:
    return [{"code": k, "label": v} for k, v in CANONICAL_STAGES.items()]
