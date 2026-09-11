from typing import Optional

def convert_arabic_digits(input_str: Optional[str]) -> Optional[str]:
    if not input_str:
        return input_str
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    english_digits = "0123456789"
    trans = str.maketrans(arabic_digits, english_digits)
    return str(input_str).translate(trans)


def normalize_phone_number(phone_str: Optional[str]) -> Optional[str]:
    """
    تنسيق وحفظ أرقام الهواتف بكود الدولة التلقائي (+20 لمصر).
    """
    if not phone_str:
        return phone_str

    clean = convert_arabic_digits(str(phone_str)).strip()
    if not clean:
        return clean

    digits = "".join(c for c in clean if c.isdigit())
    if not digits:
        return clean

    if digits.startswith("20") and len(digits) >= 11:
        return f"+{digits}"

    if digits.startswith("0"):
        return f"+20{digits[1:]}"

    if len(digits) == 10 and digits[0] in ("1", "2", "3"):
        return f"+20{digits}"

    return f"+20{digits}"


def is_valid_egyptian_mobile(phone_str: Optional[str]) -> bool:
    """
    التحقق الصارم من أن الرقم رقم محمول مصري مكون من 11 رقم يبدأ بـ 010, 011, 012, 015.
    """
    if not phone_str:
        return False
    clean = convert_arabic_digits(str(phone_str)).strip()
    digits = "".join(c for c in clean if c.isdigit())
    if digits.startswith("0"):
        return len(digits) == 11 and digits[1:3] in ("10", "11", "12", "15")
    if digits.startswith("20"):
        return len(digits) == 12 and digits[2:4] in ("10", "11", "12", "15")
    if len(digits) == 10 and digits[:2] in ("10", "11", "12", "15"):
        return True
    return False


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

