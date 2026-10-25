from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

import main
from gemini_parser import ParserUnavailableError
from schemas import ScheduleExtractionSchema


UTC = timezone.utc
START = datetime(2026, 1, 15, 18, 0, tzinfo=UTC)
PROMPT = (
    "Charge 7 kWh. I need it by 8pm, usually by 9pm, and maybe by 10pm. "
    "The charge may be split."
)


def extraction(**overrides):
    values = {
        "appliance": "ev_charger",
        "required_kwh": 7.0,
        "run_duration_hours": None,
        "is_contiguous": False,
        "earliest_local_deadline": "2026-01-15T20:00",
        "expected_local_deadline": "2026-01-15T21:00",
        "latest_local_deadline": "2026-01-15T22:00",
        "quiet_hours_start": None,
        "quiet_hours_end": None,
        "evidence_quotes": {
            "earliest": "need it by 8pm",
            "expected": "usually by 9pm",
            "latest": "maybe by 10pm",
        },
        "needs_clarification": False,
    }
    values.update(overrides)
    return ScheduleExtractionSchema.model_validate(values)


class StubParser:
    def __init__(self, result=None, error=None):
        self.result = result or extraction()
        self.error = error
        self.calls = []

    def parse(self, user_prompt, current_time_iso):
        self.calls.append((user_prompt, current_time_iso))
        if self.error is not None:
            raise self.error
        return self.result


def forecast():
    rates = [30, 30, 5, 25, 4, 20, 3, 15]
    result = []
    for index, rate in enumerate(rates):
        start = START + timedelta(minutes=30 * index)
        result.append(
            {
                "valid_from": start.isoformat().replace("+00:00", "Z"),
                "valid_to": (start + timedelta(minutes=30)).isoformat().replace(
                    "+00:00", "Z"
                ),
                "spot_rate": rate,
                "p10": rate - 2,
                "p50": rate,
                "p90": rate + 2,
                "carbon_intensity": 150,
                "is_auction_cleared": False,
            }
        )
    return result


def body():
    return {
        "user_prompt": PROMPT,
        "current_time_iso": START.isoformat().replace("+00:00", "Z"),
        "carbon_weight": 0.0,
        "risk_appetite": "balanced",
    }


def post(monkeypatch, parser):
    main.app.dependency_overrides[main.get_schedule_parser] = lambda: parser
    monkeypatch.setattr(main.data_service, "fetch_octopus_agile_rates", lambda: [])
    monkeypatch.setattr(main.data_service, "fetch_oxford_weather", lambda: {})
    monkeypatch.setattr(main.data_service, "fetch_uk_carbon_intensity", lambda: [])
    monkeypatch.setattr(
        main.forecast_engine,
        "forecast_horizons",
        lambda _rates, _weather, _carbon, **_kwargs: forecast(),
    )
    try:
        return TestClient(main.app).post("/api/parse-and-schedule", json=body())
    finally:
        main.app.dependency_overrides.clear()


def test_endpoint_returns_locked_three_scenario_response(monkeypatch):
    response = post(monkeypatch, StubParser())

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert set(payload["scenarios"]) == {
        "earliest_interpretation",
        "expected_interpretation",
        "latest_interpretation",
    }
    earliest = payload["scenarios"]["earliest_interpretation"]
    assert earliest["baseline_cost_gbp"] == 2.1
    assert earliest["estimated_cost_gbp"] == 1.05
    assert earliest["savings_vs_now_gbp"] == 1.05
    assert earliest["recommended_slot_energy_kwh"] == [3.5, 3.5]
    assert payload["flexibility_spread_pence"] == 80


def test_endpoint_returns_clarification_without_scenarios(monkeypatch):
    contradictory = extraction(
        earliest_local_deadline="2026-01-15T22:00",
        expected_local_deadline="2026-01-15T21:00",
        latest_local_deadline="2026-01-15T20:00",
    )
    response = post(monkeypatch, StubParser(contradictory))

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "needs_clarification"
    assert payload["needs_clarification"] is True
    assert payload["scenarios"] is None
    assert "chronologically contradictory" in payload["clarification_message"]


def test_endpoint_returns_impossible_when_quiet_hours_remove_capacity(monkeypatch):
    quiet = extraction(quiet_hours_start="18:30", quiet_hours_end="20:00")
    response = post(monkeypatch, StubParser(quiet))

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "impossible_constraint"
    assert payload["scenarios"] is None
    assert "Earliest Interpretation" in payload["clarification_message"]


def test_endpoint_sanitizes_live_parser_transport_failure(monkeypatch):
    response = post(
        monkeypatch,
        StubParser(error=ParserUnavailableError("private provider detail")),
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "Gemini schedule parsing is temporarily unavailable"


def test_endpoint_returns_503_for_malformed_forecast(monkeypatch):
    parser = StubParser()
    main.app.dependency_overrides[main.get_schedule_parser] = lambda: parser
    monkeypatch.setattr(main.data_service, "fetch_octopus_agile_rates", lambda: [])
    monkeypatch.setattr(main.data_service, "fetch_oxford_weather", lambda: {})
    monkeypatch.setattr(main.data_service, "fetch_uk_carbon_intensity", lambda: [])
    monkeypatch.setattr(
        main.forecast_engine,
        "forecast_horizons",
        lambda _rates, _weather, _carbon, **_kwargs: [{"valid_from": "not-a-time"}],
    )
    try:
        response = TestClient(main.app).post("/api/parse-and-schedule", json=body())
    finally:
        main.app.dependency_overrides.clear()

    assert response.status_code == 503
    assert "usable half-hour forecast" in response.json()["detail"]
