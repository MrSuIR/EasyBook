from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from src.config import settings


def local_today(now: datetime | None = None) -> date:
    """Return the business date in the configured application timezone."""
    instant = now or datetime.now(timezone.utc)
    if instant.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    return instant.astimezone(ZoneInfo(settings.TIMEZONE)).date()
