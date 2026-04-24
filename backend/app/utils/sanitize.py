"""
Input sanitization helpers.

Strips HTML tags and normalizes whitespace on all freeform text fields
to prevent XSS in any future web-rendered context (email templates, admin views).
"""

import re


# Allow zero tags — strip everything
_TAG_RE = re.compile(r"<[^>]+>")
_MULTI_SPACE = re.compile(r"\s{3,}")


def strip_html(text: str) -> str:
    """Remove HTML tags and collapse excessive whitespace."""
    if not text:
        return text
    cleaned = _TAG_RE.sub(" ", text)
    cleaned = _MULTI_SPACE.sub("  ", cleaned)
    return cleaned.strip()


def sanitize_text(value: str | None, max_length: int | None = None) -> str | None:
    """Strip HTML + enforce max length. Returns None if input is None."""
    if value is None:
        return None
    cleaned = strip_html(value)
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned
