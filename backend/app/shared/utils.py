from typing import Optional

def normalize_phone_number(phone_str: Optional[str]) -> Optional[str]:
    """
    تنسيق وحفظ أرقام الهواتف بكود الدولة التلقائي (+20 لمصر).
    - 01012345678   -> +201012345678
    - 201012345678  -> +201012345678
    - +201012345678 -> +201012345678
    - 1012345678    -> +201012345678
    """
    if not phone_str:
        return phone_str

    clean = str(phone_str).strip()
    if not clean:
        return clean

    # Extract digits only
    digits = "".join(c for c in clean if c.isdigit())
    if not digits:
        return clean

    # Case 1: Already has country code 20 (e.g. 201012345678)
    if digits.startswith("20") and len(digits) >= 11:
        return f"+{digits}"

    # Case 2: Starts with 0 (e.g. 01012345678 -> +201012345678)
    if digits.startswith("0"):
        return f"+20{digits[1:]}"

    # Case 3: 10 digits starting with 1, 2, etc. (e.g. 1012345678 -> +201012345678)
    if len(digits) == 10 and digits[0] in ("1", "2", "3"):
        return f"+20{digits}"

    # Case 4: Starts with plus originally
    return f"+20{digits}"


def is_valid_whatsapp_number(phone_str: Optional[str]) -> bool:
    """
    التحقق من صحة رقم محمول الواتساب.
    يجب أن يكون رقم محمول مصر يرجع لنطاق الشرايح المحمولة (010, 011, 012, 015)
    أو رقم دولي صالح للهواتف المحمولة.
    """
    if not phone_str:
        return True  # Optional
    clean = str(phone_str).strip()
    if not clean:
        return True

    digits = "".join(c for c in clean if c.isdigit())
    if len(digits) < 8 or len(digits) > 15:
        return False

    # Egyptian Mobile validation (11 digits starting with 010, 011, 012, 015)
    if digits.startswith("0"):
        return len(digits) == 11 and digits[1:3] in ("10", "11", "12", "15")

    # Egyptian Mobile with 20 prefix (12 digits starting with 2010, 2011, 2012, 2015)
    if digits.startswith("20"):
        if len(digits) == 12:
            return digits[2:4] in ("10", "11", "12", "15")
        return len(digits) >= 11

    # Egyptian Mobile 10 digits without leading 0 (1012345678)
    if len(digits) == 10 and digits[:2] in ("10", "11", "12", "15"):
        return True

    # International mobile numbers (9 to 15 digits)
    return len(digits) >= 9
