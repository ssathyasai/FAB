from datetime import datetime


def current_month() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def days_in_month(month_str: str) -> int:
    from calendar import monthrange
    year, month = map(int, month_str.split("-"))
    return monthrange(year, month)[1]


def days_elapsed(month_str: str) -> int:
    year, month = map(int, month_str.split("-"))
    today = datetime.utcnow()
    return min(today.day, days_in_month(month_str))


def days_remaining(month_str: str) -> int:
    return days_in_month(month_str) - days_elapsed(month_str)


def format_inr(amount: float) -> str:
    return f"₹{amount:,.2f}"


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
        elif isinstance(val, list):
            doc[key] = [serialize_doc(v) if isinstance(v, dict) else v for v in val]
        elif isinstance(val, dict):
            doc[key] = serialize_doc(val)
    return doc


def serialize_docs(docs) -> list:
    return [serialize_doc(d) for d in docs]
