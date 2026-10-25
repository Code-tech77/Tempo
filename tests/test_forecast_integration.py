from datetime import datetime, timedelta, timezone

import numpy as np

from data_service import DataService
from forecast_engine import ForecastEngine, evaluate_selected_schedule_risk


UTC = timezone.utc
START = datetime(2026, 1, 15, 18, 0, tzinfo=UTC)


class StubModel:
    def __init__(self, value):
        self.value = value

    def predict(self, features):
        return np.full(len(features), self.value, dtype=float)


def engine_without_training():
    engine = ForecastEngine.__new__(ForecastEngine)
    engine.p10_model = StubModel(10.0)
    engine.p50_model = StubModel(15.0)
    engine.p90_model = StubModel(20.0)
    return engine


def tariff_slots():
    result = []
    for index, price in enumerate((12.0, 14.0)):
        start = START + timedelta(minutes=30 * index)
        result.append(
            {
                "value_inc_vat": price,
                "valid_from": start.isoformat().replace("+00:00", "Z"),
                "valid_to": (start + timedelta(minutes=30)).isoformat().replace(
                    "+00:00", "Z"
                ),
                "_tempo_source": "octopus_live",
            }
        )
    return result


def carbon_slots():
    result = []
    for index, carbon in enumerate((101, 202)):
        start = START + timedelta(minutes=30 * index)
        result.append(
            {
                "from": start.isoformat().replace("+00:00", "Z"),
                "to": (start + timedelta(minutes=30)).isoformat().replace(
                    "+00:00", "Z"
                ),
                "intensity": {"actual": None, "forecast": carbon},
                "_tempo_source": "national_grid_live",
            }
        )
    return result


def weather():
    return {
        "wind_speed_10m": [5.0, 5.0],
        "temperature_2m": [12.0, 12.0],
        "direct_normal_irradiance": [0.0, 0.0],
        "_tempo_source": "open_meteo_live",
    }


def test_forecast_uses_timestamp_aligned_national_grid_carbon():
    result = engine_without_training().forecast_horizons(
        tariff_slots(),
        weather(),
        carbon_slots(),
        horizon_start_utc=START,
        horizon_slots=2,
    )

    assert [slot["carbon_intensity"] for slot in result] == [101.0, 202.0]
    assert {slot["price_source"] for slot in result} == {"octopus_live"}
    assert {slot["carbon_source"] for slot in result} == {"national_grid_live"}
    assert {slot["weather_source"] for slot in result} == {"open_meteo_live"}


def test_missing_carbon_is_explicitly_labelled_as_a_model_estimate():
    result = engine_without_training().forecast_horizons(
        tariff_slots(),
        weather(),
        [],
        horizon_start_utc=START,
        horizon_slots=2,
    )

    assert {slot["carbon_source"] for slot in result} == {"model_estimate"}


def test_published_prices_are_extended_with_an_explicit_model_forecast():
    result = engine_without_training().forecast_horizons(
        tariff_slots(),
        weather(),
        carbon_slots(),
        horizon_start_utc=START,
        horizon_slots=4,
    )

    assert len(result) == 4
    assert [slot["price_source"] for slot in result[:2]] == [
        "octopus_live",
        "octopus_live",
    ]
    assert [slot["price_source"] for slot in result[2:]] == [
        "quantile_model_forecast",
        "quantile_model_forecast",
    ]
    assert result[-1]["valid_to"] == "2026-01-15T20:00:00Z"


def test_selected_schedule_risk_is_reproducible_and_bounded():
    allocations = [
        {"p10": 5.0, "p50": 10.0, "p90": 30.0, "energy_kwh": 3.5},
        {"p10": 4.0, "p50": 9.0, "p90": 25.0, "energy_kwh": 3.5},
    ]

    first = evaluate_selected_schedule_risk(
        allocations,
        baseline_cost_pence=100.0,
        random_seed=1337,
    )
    second = evaluate_selected_schedule_risk(
        allocations,
        baseline_cost_pence=100.0,
        random_seed=1337,
    )

    assert first == second
    assert 0.0 <= first[0] <= 100.0
    assert first[1] >= 0.0


def test_generated_data_is_tagged_and_stable_within_one_half_hour():
    service = DataService.__new__(DataService)

    first_rates = service._generate_fallback_agile_series()
    second_rates = service._generate_fallback_agile_series()
    carbon = service._generate_fallback_carbon_series()
    weather_data = service._generate_fallback_weather_series()

    assert first_rates == second_rates
    assert {slot["_tempo_source"] for slot in first_rates} == {
        "generated_fallback"
    }
    assert {slot["_tempo_source"] for slot in carbon} == {"generated_fallback"}
    assert weather_data["_tempo_source"] == "generated_fallback"
