from datetime import datetime, timezone

import pytest

from src.utils.time import local_today


def test_local_today_uses_configured_business_timezone(monkeypatch):
    monkeypatch.setattr("src.utils.time.settings.TIMEZONE", "Europe/Moscow")

    assert local_today(datetime(2026, 8, 30, 21, 30, tzinfo=timezone.utc)).isoformat() == "2026-08-31"


def test_local_today_rejects_naive_datetime():
    with pytest.raises(ValueError, match="timezone-aware"):
        local_today(datetime(2026, 8, 31, 12, 0))
