"""Dialect-aware column type aliases for SQLAlchemy models.

Use these instead of importing directly from sqlalchemy.dialects.postgresql so that
the test suite can use an in-memory SQLite database without rendering errors.
"""

from sqlalchemy import ARRAY as _SA_ARRAY, JSON
from sqlalchemy.dialects.postgresql import JSONB as _PG_JSONB
from sqlalchemy.dialects.postgresql import UUID as _PG_UUID

# PostgreSQL native JSONB; falls back to generic JSON on SQLite / other dialects.
JSONB = _PG_JSONB().with_variant(JSON(), "sqlite")

# PostgreSQL native UUID; falls back to String(36) on SQLite / other dialects.
UUID = _PG_UUID


def ARRAY(item_type):
    """PostgreSQL ARRAY type; falls back to JSON storage on SQLite / other dialects."""
    return _SA_ARRAY(item_type).with_variant(JSON(), "sqlite")
