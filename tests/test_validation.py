from datetime import datetime, time, timezone

import pytest

from schemas import ResponseStatus, ScheduleExtractionSchema
from scheduler import (
    LocalTimeConversionError,
    convert_local_to_utc,
    validate_gemini_output,
)


UTC = timezone.utc
START = datetime(2026, 10, 24, 18, 0, tzinfo=UTC)
HORIZON_END = datetime(2026, 10, 26, 18, 0, tzinfo=UTC)
VALID_PROMPT = (
    "I need 14 kWh added to my EV. The charging may be split. "
    "I will definitely not leave before 7:00am, usually leave around 7:30am, "
    "and may leave at 8:15am."
)


def extraction(**overrides):
    values = {
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
            "earliest": "definitely not leave before 7:00am",
            "expected": "usually leave around 7:30am",
            "latest": "may leave at 8:15am",
        },
        "needs_clarification": False,
    }
    values.update(overrides)
    return ScheduleExtractionSchema.model_validate(values)


def validate(candidate=None, *, prompt=VALID_PROMPT, start=START, horizon=HORIZON_END):
    return validate_gemini_output(
        prompt,
        candidate or extraction(),
        start_time_utc=start,
        forecast_horizon_end_utc=horizon,
    )


def test_valid_ev_extraction_becomes_immutable_utc_solver_input():
    outcome = validate()

    assert outcome.status == ResponseStatus.SUCCESS
    assert outcome.is_valid is True
    assert outcome.needs_clarification is False
    assert outcome.validated is not None
    assert outcome.validated.appliance == "ev_charger"
    assert outcome.validated.max_power_kw == 7.0
    assert outcome.validated.energy_kwh == 14.0
    assert outcome.validated.required_slots == 4
    assert outcome.validated.earliest_utc == datetime(2026, 10, 25, 7, 0, tzinfo=UTC)
    assert outcome.validated.expected_utc == datetime(2026, 10, 25, 7, 30, tzinfo=UTC)
    assert outcome.validated.latest_utc == datetime(2026, 10, 25, 8, 15, tzinfo=UTC)


def test_winter_and_summer_local_times_use_the_correct_offsets():
    winter = convert_local_to_utc("2026-01-15T07:00")
    summer = convert_local_to_utc("2026-07-15T07:00")

    assert winter.utc_value == datetime(2026, 1, 15, 7, 0, tzinfo=UTC)
    assert summer.utc_value == datetime(2026, 7, 15, 6, 0, tzinfo=UTC)
    assert winter.is_ambiguous is False
    assert summer.is_ambiguous is False


def test_autumn_repeated_hour_uses_fold_zero_and_surfaces_warning():
    converted = convert_local_to_utc("2026-10-25T01:30")

    assert converted.utc_value == datetime(2026, 10, 25, 0, 30, tzinfo=UTC)
    assert converted.fold == 0
    assert converted.is_ambiguous is True
    assert "fold=0" in converted.warning


def test_ambiguous_deadline_warning_reaches_the_validation_outcome():
    prompt = (
        "Charge 3.5 kWh by 1:30am, normally by 2am, and at the latest 2:30am. "
        "The charging may be split."
    )
    candidate = extraction(
        required_kwh=3.5,
        earliest_local_deadline="2026-10-25T01:30",
        expected_local_deadline="2026-10-25T02:00",
        latest_local_deadline="2026-10-25T02:30",
        evidence_quotes={
            "earliest": "by 1:30am",
            "expected": "normally by 2am",
            "latest": "at the latest 2:30am",
        },
    )

    outcome = validate(
        candidate,
        prompt=prompt,
        start=datetime(2026, 10, 24, 23, 0, tzinfo=UTC),
    )

    assert outcome.status == ResponseStatus.SUCCESS
    assert outcome.validation_warning is not None
    assert "fold=0" in outcome.validation_warning
    assert outcome.validated.earliest_fold == 0
    assert outcome.validated.earliest_utc == datetime(2026, 10, 25, 0, 30, tzinfo=UTC)


def test_nonexistent_spring_forward_time_is_rejected():
    with pytest.raises(LocalTimeConversionError, match="does not exist"):
        convert_local_to_utc("2026-03-29T01:30")


def test_nonexistent_deadline_requests_clarification_without_repair():
    candidate = extraction(
        earliest_local_deadline="2026-03-29T01:30",
        expected_local_deadline="2026-03-29T02:30",
        latest_local_deadline="2026-03-29T03:00",
    )
    outcome = validate(
        candidate,
        start=datetime(2026, 3, 28, 18, 0, tzinfo=UTC),
        horizon=datetime(2026, 3, 30, 18, 0, tzinfo=UTC),
    )

    assert outcome.status == ResponseStatus.NEEDS_CLARIFICATION
    assert "does not exist" in outcome.clarification_message


def test_contradictory_deadlines_are_not_reordered_or_mutated():
    candidate = extraction(
        earliest_local_deadline="2026-10-25T09:00",
        expected_local_deadline="2026-10-25T08:00",
        latest_local_deadline="2026-10-25T07:00",
    )
    before = candidate.model_dump()

    outcome = validate(candidate)

    assert outcome.status == ResponseStatus.NEEDS_CLARIFICATION
    assert "chronologically contradictory" in outcome.clarification_message
    assert "did not reorder" in outcome.clarification_message
    assert candidate.model_dump() == before


def test_deadline_at_or_before_start_requests_clarification():
    candidate = extraction(
        earliest_local_deadline="2026-10-24T18:00",
        expected_local_deadline="2026-10-24T19:00",
        latest_local_deadline="2026-10-24T20:00",
    )

    outcome = validate(candidate)

    assert outcome.status == ResponseStatus.NEEDS_CLARIFICATION
    assert "must be after" in outcome.clarification_message


def test_evidence_verification_allows_case_and_whitespace_normalization():
    candidate = extraction(
        evidence_quotes={
            "earliest": "DEFINITELY   NOT LEAVE BEFORE 7:00AM",
            "expected": "USUALLY LEAVE AROUND 7:30AM",
            "latest": "MAY LEAVE AT 8:15AM",
        }
    )

    assert validate(candidate).status == ResponseStatus.SUCCESS


def test_hallucinated_evidence_requests_clarification():
    candidate = extraction(
        evidence_quotes={
            "earliest": "definitely not leave before 7:00am",
            "expected": "a meeting at 7:30am that was never mentioned",
            "latest": "may leave at 8:15am",
        }
    )

    outcome = validate(candidate)

    assert outcome.status == ResponseStatus.NEEDS_CLARIFICATION
    assert "expected evidence quote" in outcome.clarification_message


def test_latest_deadline_outside_forecast_horizon_is_impossible():
    outcome = validate(horizon=datetime(2026, 10, 25, 8, 0, tzinfo=UTC))

    assert outcome.status == ResponseStatus.IMPOSSIBLE_CONSTRAINT
    assert "outside the available forecast horizon" in outcome.clarification_message


def test_impossible_ev_energy_reports_actual_power_and_slot_math():
    prompt = (
        "I need 14 kWh added to my EV by 8pm, usually by 8:30pm, "
        "and maybe by 9pm."
    )
    candidate = extraction(
        earliest_local_deadline="2026-10-24T20:00",
        expected_local_deadline="2026-10-24T20:30",
        latest_local_deadline="2026-10-24T21:00",
        evidence_quotes={
            "earliest": "by 8pm",
            "expected": "usually by 8:30pm",
            "latest": "maybe by 9pm",
        },
    )

    outcome = validate(candidate, prompt=prompt)

    assert outcome.status == ResponseStatus.IMPOSSIBLE_CONSTRAINT
    assert "7.0 kW" in outcome.clarification_message
    assert "7.00 kWh" in outcome.clarification_message
    assert "14.00 kWh was requested" in outcome.clarification_message


def test_impossible_cycle_duration_reports_available_time():
    prompt = "Run my dishwasher for 2 hours; done by 8pm, expected 8:30pm, latest 9pm."
    candidate = extraction(
        appliance="dishwasher",
        required_kwh=None,
        run_duration_hours=2.0,
        is_contiguous=True,
        earliest_local_deadline="2026-10-24T20:00",
        expected_local_deadline="2026-10-24T20:30",
        latest_local_deadline="2026-10-24T21:00",
        evidence_quotes={
            "earliest": "done by 8pm",
            "expected": "expected 8:30pm",
            "latest": "latest 9pm",
        },
    )

    outcome = validate(candidate, prompt=prompt)

    assert outcome.status == ResponseStatus.IMPOSSIBLE_CONSTRAINT
    assert "1.00 hours" in outcome.clarification_message
    assert "requested cycle lasts 2.00 hours" in outcome.clarification_message


@pytest.mark.parametrize("appliance", ["dishwasher", "washing_machine"])
def test_fixed_cycles_cannot_be_silently_changed_to_split(appliance):
    candidate = extraction(appliance=appliance, is_contiguous=False)

    outcome = validate(candidate)

    assert outcome.status == ResponseStatus.NEEDS_CLARIFICATION
    assert "must run continuously" in outcome.clarification_message


def test_partial_extraction_stops_before_timezone_or_physical_validation():
    candidate = ScheduleExtractionSchema(
        appliance="ev_charger",
        needs_clarification=True,
    )

    outcome = validate(candidate, prompt="Charge my EV sometime.")

    assert outcome.status == ResponseStatus.NEEDS_CLARIFICATION
    assert "Missing:" in outcome.clarification_message
    assert outcome.validated is None


def test_identical_quiet_hour_bounds_require_clarification():
    candidate = extraction(quiet_hours_start="23:00", quiet_hours_end="23:00")

    outcome = validate(candidate)

    assert outcome.status == ResponseStatus.NEEDS_CLARIFICATION
    assert "Quiet-hours start and end are identical" in outcome.clarification_message


def test_valid_quiet_hours_are_preserved_for_stage_d():
    candidate = extraction(quiet_hours_start="23:00", quiet_hours_end="06:00")

    outcome = validate(candidate)

    assert outcome.is_valid is True
    assert outcome.validated.quiet_hours_start == time(23, 0)
    assert outcome.validated.quiet_hours_end == time(6, 0)


def test_non_utc_integration_boundaries_are_rejected():
    with pytest.raises(ValueError, match="must be timezone-aware UTC"):
        validate(start=datetime(2026, 10, 24, 18, 0))


def test_horizon_must_follow_start():
    with pytest.raises(ValueError, match="must be after"):
        validate(horizon=START)
