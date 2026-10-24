from datetime import datetime

from fastapi.testclient import TestClient

from gemini_parser import (
    ParserConfigurationError,
    ParserOutputError,
    ParserUnavailableError,
)
from main import app, get_schedule_parser
from schemas import ScheduleExtractionSchema


VALID_RESPONSE = ScheduleExtractionSchema.model_validate(
    {
        "appliance": "ev_charger",
        "required_kwh": 14.0,
        "run_duration_hours": None,
        "is_contiguous": False,
        "earliest_local_deadline": "2026-10-25T07:00",
        "expected_local_deadline": "2026-10-25T07:30",
        "latest_local_deadline": "2026-10-25T08:15",
        "quiet_hours_start": None,
        "quiet_hours_end": None,
        "evidence_quotes": {
            "earliest": "no earlier than 7:00am",
            "expected": "usually leave around 7:30am",
            "latest": "maybe 8:15am",
        },
        "needs_clarification": False,
    }
)


class StubParser:
    def __init__(self, result=VALID_RESPONSE, error=None):
        self.result = result
        self.error = error
        self.calls = []

    def parse(self, user_prompt: str, current_time_iso: datetime):
        self.calls.append((user_prompt, current_time_iso))
        if self.error:
            raise self.error
        return self.result


def request_body():
    return {
        "user_prompt": (
            "Charge 14 kWh. I usually leave around 7:30am, no earlier than "
            "7:00am, and maybe 8:15am."
        ),
        "current_time_iso": "2026-10-24T18:00:00Z",
        "carbon_weight": 0.3,
        "risk_appetite": "balanced",
    }


def test_parse_constraints_route_returns_locked_extraction():
    parser = StubParser()
    app.dependency_overrides[get_schedule_parser] = lambda: parser
    try:
        response = TestClient(app).post("/api/parse-constraints", json=request_body())
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["appliance"] == "ev_charger"
    assert response.json()["required_kwh"] == 14.0
    assert len(parser.calls) == 1
    assert parser.calls[0][1].utcoffset().total_seconds() == 0


def test_missing_live_configuration_returns_503():
    parser = StubParser(error=ParserConfigurationError("GEMINI_API_KEY missing"))
    app.dependency_overrides[get_schedule_parser] = lambda: parser
    try:
        response = TestClient(app).post("/api/parse-constraints", json=request_body())
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["detail"] == "GEMINI_API_KEY missing"


def test_transport_and_output_failures_return_sanitized_502():
    for error, expected_detail in [
        (
            ParserUnavailableError("private provider detail"),
            "Gemini schedule parsing is temporarily unavailable",
        ),
        (
            ParserOutputError("private model output"),
            "Gemini returned an invalid structured schedule",
        ),
    ]:
        parser = StubParser(error=error)
        app.dependency_overrides[get_schedule_parser] = lambda parser=parser: parser
        try:
            response = TestClient(app).post("/api/parse-constraints", json=request_body())
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 502
        assert response.json()["detail"] == expected_detail


def test_request_contract_rejects_unknown_fields_before_gemini_call():
    parser = StubParser()
    app.dependency_overrides[get_schedule_parser] = lambda: parser
    body = {**request_body(), "unexpected": True}
    try:
        response = TestClient(app).post("/api/parse-constraints", json=body)
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    assert parser.calls == []
