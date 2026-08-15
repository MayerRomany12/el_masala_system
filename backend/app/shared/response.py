# Response helpers for members routes
from typing import Any, Optional

def success_response(data: Any = None, message: str = "تمت العملية بنجاح") -> dict:
    """Convert MongoDB document data to JSON-serializable response."""
    if data is None:
        return {"success": True, "message": message, "data": None}

    # Handle list responses (pagination)
    if isinstance(data, dict):
        cleaned = _clean_doc(data)
    else:
        cleaned = data

    return {"success": True, "message": message, "data": cleaned}


def _clean_doc(doc: dict) -> dict:
    """Strip MongoDB ObjectId and convert datetime to ISO string."""
    import json
    from datetime import datetime

    cleaned = {}
    for k, v in doc.items():
        if k == "_id":
            continue  # skip MongoDB internal _id
        elif isinstance(v, datetime):
            cleaned[k] = v.isoformat()
        elif isinstance(v, dict):
            cleaned[k] = _clean_doc(v)
        elif isinstance(v, list):
            cleaned[k] = [
                _clean_doc(i) if isinstance(i, dict) else i
                for i in v
            ]
        else:
            cleaned[k] = v
    return cleaned
