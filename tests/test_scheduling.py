from datetime import datetime, time, timedelta, timezone

import pytest

from schemas import EvidenceQuotes
from scheduler import (
    ForecastDataError,
    ScheduleOptimizationError,
    ValidatedScheduleConstraints,
    normalize_forecast_slots,
    run_multi_scenario_schedule,
)


UTC = timezone.utc
START = datetime(2026, 1, 15, 18, 0, tzinfo=UTC)


def raw_forecast(rates, *, carbons=None, spreads=None):
    carbons = carbons or [150.0] * len(rates)
    spreads = spreads or [(2.0, 2.0)] * len(rates)
    slots = []
    for index, (rate, carbon, spread) in enumerate(zip(rates, carbons, spreads)):
        start = START + timedelta(minutes=30 * index)
        low_spread, high_spread = spread
        slots.append(
            {
                "valid_from": start.isoformat().replace("+00:00", "Z"),
                "valid_to": (start + timedelta(minutes=30)).isoformat().replace(
                    "+00:00", "Z"
                ),
                "spot_rate": rate,
                "p10": rate - low_spread,
                "p50": rate,
                "p90": rate + high_spread,
                "carbon_intensity": carbon,
                "is_auction_cleared": False,
            }
        )
    return slots


def constraints(
    *,
    energy_kwh=7.0,
    max_power_kw=7.0,
    required_slots=2,
    is_contiguous=False,
    appliance="ev_charger",
    appliance_label="EV Charger",
    earliest_hours=2.0,
    expected_hours=3.0,
    latest_hours=4.0,
    quiet_start=None,
    quiet_end=None,
):
    earliest = START + timedelta(hours=earliest_hours)
    expected = START + timedelta(hours=expected_hours)
    latest = START + timedelta(hours=latest_hours)
    return ValidatedScheduleConstraints(
        start_time_utc=START,
        forecast_horizon_end_utc=latest,
        appliance=appliance,
        appliance_label=appliance_label,
        max_power_kw=max_power_kw,
        energy_kwh=energy_kwh,
        run_duration_hours=energy_kwh / max_power_kw,
        required_slots=required_slots,
        is_contiguous=is_contiguous,
        earliest_local_deadline=earliest.strftime("%Y-%m-%dT%H:%M"),
        expected_local_deadline=expected.strftime("%Y-%m-%dT%H:%M"),
        latest_local_deadline=latest.strftime("%Y-%m-%dT%H:%M"),
        earliest_utc=earliest,
        expected_utc=expected,
        latest_utc=latest,
        earliest_fold=0,
        expected_fold=0,
        latest_fold=0,
        quiet_hours_start=quiet_start,
        quiet_hours_end=quiet_end,
        evidence_quotes=EvidenceQuotes(
            earliest="earliest evidence",
            expected="expected evidence",
            latest="latest evidence",
        ),
    )


def schedule(raw_slots, candidate=None, *, carbon_weight=0.0, risk="balanced"):
    candidate = candidate or constraints()
    slots = normalize_forecast_slots(raw_slots, start_time_utc=START)
    return run_multi_scenario_schedule(
        candidate,
        slots,
        carbon_weight=carbon_weight,
        risk_appetite=risk,
    )


def test_split_ev_uses_cheapest_slots_and_reports_reproducible_savings():
    result = schedule(raw_forecast([30, 30, 5, 25, 4, 20, 3, 15]))

    earliest = result.scenarios.earliest_interpretation
    latest = result.scenarios.latest_interpretation
    assert earliest.recommended_slots_utc == [
        "2026-01-15T19:00Z",
        "2026-01-15T19:30Z",
    ]
    assert latest.recommended_slots_utc == [
        "2026-01-15T20:00Z",
        "2026-01-15T21:00Z",
    ]
    assert earliest.baseline_cost_gbp == 2.10
    assert earliest.estimated_cost_gbp == 1.05
    assert earliest.savings_vs_now_gbp == 1.05
    assert earliest.baseline_cost_gbp == round(
        earliest.estimated_cost_gbp + earliest.savings_vs_now_gbp,
        2,
    )
    assert result.flexibility_spread_pence == 80


def test_contiguous_cycle_cannot_select_separated_cheap_slots():
    candidate = constraints(
        energy_kwh=1.8,
        max_power_kw=1.8,
        required_slots=2,
        is_contiguous=True,
        appliance="dishwasher",
        appliance_label="Dishwasher",
    )
    result = schedule(raw_forecast([30, 1, 40, 1, 50, 50, 50, 50]), candidate)

    earliest = result.scenarios.earliest_interpretation
    assert earliest.recommended_slots_utc == [
        "2026-01-15T18:00Z",
        "2026-01-15T18:30Z",
    ]


def test_quiet_hours_remove_otherwise_cheapest_slots():
    candidate = constraints(
        quiet_start=time(19, 0),
        quiet_end=time(20, 0),
    )
    result = schedule(raw_forecast([20, 19, -5, -4, 10, 9, 8, 7]), candidate)

    earliest = result.scenarios.earliest_interpretation
    assert earliest.recommended_slots_utc == [
        "2026-01-15T18:00Z",
        "2026-01-15T18:30Z",
    ]


def test_overnight_quiet_hours_apply_on_both_sides_of_midnight():
    overnight_start = datetime(2026, 1, 15, 22, 0, tzinfo=UTC)
    rates = [20, 19] + list(range(-14, 0)) + [-10, 8]
    raw_slots = []
    for index, rate in enumerate(rates):
        slot_start = overnight_start + timedelta(minutes=30 * index)
        raw_slots.append(
            {
                "valid_from": slot_start.isoformat().replace("+00:00", "Z"),
                "valid_to": (slot_start + timedelta(minutes=30)).isoformat().replace(
                    "+00:00", "Z"
                ),
                "spot_rate": rate,
                "p10": rate - 1,
                "p50": rate,
                "p90": rate + 1,
                "carbon_intensity": 150,
                "is_auction_cleared": False,
            }
        )
    candidate = constraints(
        energy_kwh=3.5,
        required_slots=1,
        earliest_hours=13.0,
        expected_hours=13.0,
        latest_hours=13.0,
        quiet_start=time(23, 0),
        quiet_end=time(6, 0),
    )
    candidate = ValidatedScheduleConstraints(
        **{
            **candidate.__dict__,
            "start_time_utc": overnight_start,
            "forecast_horizon_end_utc": overnight_start + timedelta(hours=9),
        }
    )
    slots = normalize_forecast_slots(raw_slots, start_time_utc=overnight_start)

    result = run_multi_scenario_schedule(
        candidate,
        slots,
        carbon_weight=0.0,
        risk_appetite="balanced",
    )

    assert result.scenarios.earliest_interpretation.recommended_slots_utc == [
        "2026-01-16T06:00Z"
    ]


def test_quiet_hours_can_make_a_scenario_impossible():
    candidate = constraints(
        quiet_start=time(18, 30),
        quiet_end=time(20, 0),
    )
    slots = normalize_forecast_slots(
        raw_forecast([20, 19, 5, 4, 10, 9, 8, 7]),
        start_time_utc=START,
    )

    with pytest.raises(ScheduleOptimizationError, match="Earliest Interpretation"):
        run_multi_scenario_schedule(
            candidate,
            slots,
            carbon_weight=0.0,
            risk_appetite="balanced",
        )


def test_carbon_weight_can_choose_a_cleaner_slightly_costlier_slot():
    candidate = constraints(
        energy_kwh=3.5,
        required_slots=1,
        earliest_hours=1.0,
        expected_hours=1.0,
        latest_hours=1.0,
    )
    forecast = raw_forecast([10, 11], carbons=[500, 10])

    cost_result = schedule(forecast, candidate, carbon_weight=0.0)
    carbon_result = schedule(forecast, candidate, carbon_weight=1.0)

    assert cost_result.scenarios.earliest_interpretation.recommended_slots_utc == [
        "2026-01-15T18:00Z"
    ]
    assert carbon_result.scenarios.earliest_interpretation.recommended_slots_utc == [
        "2026-01-15T18:30Z"
    ]
    assert carbon_result.scenarios.earliest_interpretation.carbon_g_co2 == 35.0


def test_risk_appetite_changes_exposure_to_wide_price_uncertainty():
    candidate = constraints(
        energy_kwh=3.5,
        required_slots=1,
        earliest_hours=1.0,
        expected_hours=1.0,
        latest_hours=1.0,
    )
    forecast = raw_forecast(
        [10, 11],
        spreads=[(10, 40), (2, 1)],
    )

    aggressive = schedule(forecast, candidate, risk="aggressive")
    safe = schedule(forecast, candidate, risk="safe")

    assert aggressive.scenarios.earliest_interpretation.recommended_slots_utc == [
        "2026-01-15T18:00Z"
    ]
    assert safe.scenarios.earliest_interpretation.recommended_slots_utc == [
        "2026-01-15T18:30Z"
    ]


def test_negative_agile_prices_are_returned_as_a_credit_without_clamping():
    candidate = constraints(
        energy_kwh=3.5,
        required_slots=1,
        earliest_hours=1.0,
        expected_hours=1.0,
        latest_hours=1.0,
    )
    result = schedule(raw_forecast([20, -10]), candidate)

    scenario = result.scenarios.earliest_interpretation
    assert scenario.estimated_cost_gbp == -0.35
    assert scenario.baseline_cost_gbp == 0.70
    assert scenario.savings_vs_now_gbp == 1.05


def test_waiting_can_report_negative_savings_without_clamping():
    candidate = constraints(
        energy_kwh=3.5,
        required_slots=1,
        earliest_hours=1.0,
        expected_hours=1.0,
        latest_hours=1.0,
        quiet_start=time(18, 0),
        quiet_end=time(18, 30),
    )
    result = schedule(raw_forecast([5, 20]), candidate)

    scenario = result.scenarios.earliest_interpretation
    assert scenario.baseline_cost_gbp == 0.18
    assert scenario.estimated_cost_gbp == 0.70
    assert scenario.savings_vs_now_gbp == -0.52


def test_partial_final_slot_uses_only_the_requested_energy():
    candidate = constraints(
        energy_kwh=5.0,
        required_slots=2,
        earliest_hours=1.0,
        expected_hours=1.0,
        latest_hours=1.0,
    )
    result = schedule(raw_forecast([10, 20]), candidate)

    scenario = result.scenarios.earliest_interpretation
    assert scenario.estimated_cost_gbp == 0.65
    assert scenario.recommended_slot_energy_kwh == [3.5, 1.5]


def test_running_now_baseline_starts_immediately_inside_the_current_tariff_slot():
    request_time = START + timedelta(minutes=5)
    candidate = constraints()
    candidate = ValidatedScheduleConstraints(
        **{
            **candidate.__dict__,
            "start_time_utc": request_time,
        }
    )
    slots = normalize_forecast_slots(
        raw_forecast([10, 20, 30, 40, 5, 6, 7, 8]),
        start_time_utc=request_time,
    )

    result = run_multi_scenario_schedule(
        candidate,
        slots,
        carbon_weight=0.0,
        risk_appetite="balanced",
    )

    assert result.scenarios.earliest_interpretation.baseline_cost_gbp == 1.17


def test_generated_or_unverified_inputs_are_visibly_labelled():
    result = schedule(raw_forecast([30, 30, 5, 25, 4, 20, 3, 15]))

    assert "fallback" in result.validation_warning
    assert "Carbon values" in result.validation_warning


def test_risk_results_are_reproducible_for_identical_input():
    forecast = raw_forecast([30, 30, 5, 25, 4, 20, 3, 15])

    first = schedule(forecast)
    second = schedule(forecast)

    assert first.scenarios == second.scenarios


def test_forecast_is_sorted_and_duplicate_or_invalid_quantiles_are_rejected():
    forecast = list(reversed(raw_forecast([10, 20, 30, 40])))
    normalized = normalize_forecast_slots(forecast, start_time_utc=START)
    assert normalized[0].start_utc == START

    duplicate = raw_forecast([10, 20])
    duplicate.append(dict(duplicate[0]))
    with pytest.raises(ForecastDataError, match="duplicate"):
        normalize_forecast_slots(duplicate, start_time_utc=START)

    bad_quantile = raw_forecast([10])
    bad_quantile[0]["p10"] = 50
    with pytest.raises(ForecastDataError, match="p10 <= p50 <= p90"):
        normalize_forecast_slots(bad_quantile, start_time_utc=START)


def test_running_now_baseline_does_not_slide_past_a_forecast_gap():
    raw_slots = raw_forecast([10, 20, 30])
    raw_slots.pop(0)
    normalized = normalize_forecast_slots(raw_slots, start_time_utc=START)

    with pytest.raises(ForecastDataError, match="run-now time"):
        run_multi_scenario_schedule(
            constraints(),
            normalized,
            carbon_weight=0.0,
            risk_appetite="balanced",
        )
