from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.inspection import inspect


def row(obj) -> dict:
    result = {}
    for column in inspect(obj).mapper.column_attrs:
        value = getattr(obj, column.key)
        if isinstance(value, (datetime, date)):
            value = value.isoformat()
        elif isinstance(value, Decimal):
            value = float(value)
        result[column.key] = value
    return result
