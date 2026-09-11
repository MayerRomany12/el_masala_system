import re
from typing import Optional


def convert_arabic_digits(input_str: Optional[str]) -> Optional[str]:
    if not input_str:
        return input_str
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    english_digits = "0123456789"
    trans = str.maketrans(arabic_digits, english_digits)
    return str(input_str).translate(trans)


def normalize_egyptian_phone(phone_str: Optional[str]) -> Optional[str]:
    """
    تنسيق حتمي ودقيق لأرقام المحمول المصرية (010, 011, 012, 015):
    - تحويل النص الفارغ أو None إلى None.
    - إزالة أي مسافات أو شرطات أو رموز زائد.
    - تحويل +20, 0020, 20 إلى البادئة 0.
    - التأكد الحتمي من أن الناتج 11 رقماً محمولاً مصرياً بصيغة 01xxxxxxxxx.
    """
    if not phone_str:
        return None

    clean = convert_arabic_digits(str(phone_str)).strip()
    if not clean:
        return None

    # Keep digits only
    digits = re.sub(r"\D", "", clean)
    if not digits:
        return None

    # Strip international country codes (+20, 0020, 20)
    if digits.startswith("0020"):
        digits = "0" + digits[4:]
    elif digits.startswith("20") and len(digits) == 12:
        digits = "0" + digits[2:]
    elif not digits.startswith("0") and len(digits) == 10 and digits[:2] in ("10", "11", "12", "15"):
        digits = "0" + digits

    # Validate exact Egyptian mobile structure: 11 digits starting with 010, 011, 012, 015
    if len(digits) == 11 and digits[:3] in ("010", "011", "012", "015"):
        return digits

    return digits if len(digits) > 0 else None


def format_whatsapp_phone(phone_str: Optional[str]) -> Optional[str]:
    """
    تحويل الرقم المُنرمل 01xxxxxxxxx إلى صيغة الواتساب العالمية بدون زائد: 201xxxxxxxxx.
    """
    normalized = normalize_egyptian_phone(phone_str)
    if not normalized:
        return None
    if normalized.startswith("01") and len(normalized) == 11:
        return "20" + normalized[1:]
    return normalized


def normalize_phone_number(phone_str: Optional[str]) -> Optional[str]:
    return normalize_egyptian_phone(phone_str)


def is_valid_egyptian_mobile(phone_str: Optional[str]) -> bool:
    if not phone_str:
        return False
    norm = normalize_egyptian_phone(phone_str)
    return norm is not None and len(norm) == 11 and norm[:3] in ("010", "011", "012", "015")


def is_valid_whatsapp_number(phone_str: Optional[str]) -> bool:
    if not phone_str:
        return True
    clean = convert_arabic_digits(str(phone_str)).strip()
    if not clean:
        return True
    return is_valid_egyptian_mobile(clean)


def validate_full_name(name_str: Optional[str]) -> bool:
    """
    التحقق من أن الاسم ثلاثي أو رباعي على الأقل وبدون أرقام.
    """
    if not name_str:
        return False
    clean = name_str.strip()
    words = [w for w in clean.split() if w]
    if len(words) < 3:
        return False
    if any(c.isdigit() for c in clean):
        return False
    return True

