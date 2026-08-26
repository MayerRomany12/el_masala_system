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
    if clean.startswith("+"):
        return f"+{digits}"

    return f"+20{digits}"
