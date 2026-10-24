"""Explicitly enabled live Gemini smoke test.

Run with both GEMINI_API_KEY and TEMPO_RUN_LIVE_TESTS=1. Normal test runs skip
this module and never consume Gemini quota.
"""

from datetime import datetime, timezone
import os

import pytest

from gemini_parser import GeminiScheduleParser


pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(
        os.getenv("TEMPO_RUN_LIVE_TESTS") != "1",
        reason="set TEMPO_RUN_LIVE_TESTS=1 to make a billable live Gemini call",
    ),
]


def test_live_gemini_structured_extraction():
    parser = GeminiScheduleParser()

    result = parser.parse(
        "I need 14 kWh added to my EV. I usually leave around 7:30am "
        "tomorrow, definitely no earlier than 7:00am, and maybe 8:15am. "
        "The charging may be split across separate intervals.",
        datetime(2026, 10, 24, 18, 0, tzinfo=timezone.utc),
    )

    assert result.appliance == "ev_charger"
    assert result.required_kwh == 14.0
    assert result.needs_clarification is False
