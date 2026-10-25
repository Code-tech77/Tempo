"""Explicitly enabled end-to-end Stage D smoke test.

Run with both GEMINI_API_KEY and TEMPO_RUN_LIVE_TESTS=1. The test makes a
billable Gemini request and may call the external price, carbon, and weather
services. Any generated fallback inputs must be labelled in the response.
"""

from datetime import datetime, timezone
import os

from fastapi.testclient import TestClient
import pytest

from main import app


pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(
        os.getenv("TEMPO_RUN_LIVE_TESTS") != "1",
        reason="set TEMPO_RUN_LIVE_TESTS=1 to run the billable live Stage D flow",
    ),
]


def test_live_parse_validate_and_optimize_three_scenarios():
    now = datetime.now(timezone.utc).replace(microsecond=0)
    response = TestClient(app).post(
        "/api/parse-and-schedule",
        json={
            "user_prompt": (
                "Add 7 kWh to my EV. Tomorrow I definitely will not leave before "
                "7:00am, usually leave at 7:30am, and may leave as late as 8:00am. "
                "The charging may be split across separate half-hour periods."
            ),
            "current_time_iso": now.isoformat().replace("+00:00", "Z"),
            "carbon_weight": 0.3,
            "risk_appetite": "balanced",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "success", payload
    assert payload["needs_clarification"] is False
    assert set(payload["scenarios"]) == {
        "earliest_interpretation",
        "expected_interpretation",
        "latest_interpretation",
    }
    for scenario in payload["scenarios"].values():
        assert scenario["recommended_slots_utc"]
        assert len(scenario["recommended_slots_utc"]) == len(
            scenario["recommended_slot_energy_kwh"]
        )
        assert round(
            scenario["baseline_cost_gbp"] - scenario["estimated_cost_gbp"],
            2,
        ) == scenario["savings_vs_now_gbp"]
