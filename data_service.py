"""
Tempo Data Service
Fetches real and synthetic grid data:
- UK National Grid Carbon Intensity API
- Open-Meteo Oxford Weather & Wind/Solar Generation
- Octopus Agile Half-Hourly Dynamic Tariffs
- DuckDB Historical London Smart Meter & Grid Load Cache
"""

import math
import random
import datetime
import requests
import duckdb
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional

OXFORD_LAT = 51.7520
OXFORD_LON = -1.2577

class DataService:
    def __init__(self, db_path: str = ":memory:"):
        self.con = duckdb.connect(db_path)
        self._init_duckdb_schema()

    def _init_duckdb_schema(self):
        """Initializes DuckDB tables for historical smart meter and agile rates."""
        self.con.execute("""
            CREATE TABLE IF NOT EXISTS historical_readings (
                timestamp TIMESTAMP,
                household_id VARCHAR,
                consumption_kwh DOUBLE,
                spot_price_p DOUBLE,
                carbon_intensity DOUBLE,
                weather_temp_c DOUBLE,
                wind_speed_ms DOUBLE
            );
        """)
        # Seed historical backtesting data if table empty
        res = self.con.execute("SELECT count(*) FROM historical_readings").fetchall()
        if res and res[0][0] == 0:
            self._seed_historical_duckdb()

    def _seed_historical_duckdb(self):
        """Generates realistic 30-day half-hourly historical dataset for 50 benchmark homes."""
        base_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
        records = []
        
        # 30 days * 48 half-hours = 1440 slots
        for slot in range(1440):
            t = base_time + datetime.timedelta(minutes=30 * slot)
            hour = t.hour + t.minute / 60.0
            day_of_week = t.weekday()
            
            # Realistic UK Agile pricing profile:
            # Low early morning (02:00-05:00): 4p - 11p, occasional negative pricing during windy nights
            # Day rate: 15p - 22p
            # Peak 16:00 - 19:00: 28p - 45p
            wind_factor = 0.5 + 0.5 * math.sin(slot / 36.0)
            solar_factor = max(0.0, math.sin((hour - 6) / 14.0 * math.pi)) if 6 <= hour <= 20 else 0.0
            
            if 16 <= hour <= 19:
                base_price = 33.5 + 8.0 * random.random()
            elif 1 <= hour <= 5:
                base_price = 8.5 - 5.0 * wind_factor + 3.0 * random.random()
            else:
                base_price = 18.0 - 4.0 * solar_factor + 3.0 * random.random()

            # Carbon intensity: 80 - 280 gCO2/kWh
            base_carbon = 190.0 - 80.0 * wind_factor - 50.0 * solar_factor + (40.0 if 16 <= hour <= 19 else 0.0)
            base_carbon = max(35.0, min(320.0, base_carbon + random.uniform(-10, 10)))
            
            wind_ms = 4.0 + 8.0 * wind_factor + random.uniform(-1.0, 1.0)
            temp_c = 11.0 + 5.0 * math.sin((hour - 8) / 24.0 * 2 * math.pi) + random.uniform(-1.0, 1.0)

            # 5 archetypal households
            for h_idx in range(5):
                hh_id = f"HH_OX_{100 + h_idx}"
                # Base consumption: fridge, standby, lighting, evening cooking
                hh_cons = 0.15 + (0.4 if 17 <= hour <= 21 else 0.05) + random.uniform(0.0, 0.1)
                records.append((t, hh_id, round(hh_cons, 3), round(base_price, 2), round(base_carbon, 1), round(temp_c, 1), round(wind_ms, 1)))

        df = pd.DataFrame(records, columns=[
            "timestamp", "household_id", "consumption_kwh", "spot_price_p",
            "carbon_intensity", "weather_temp_c", "wind_speed_ms"
        ])
        self.con.execute("INSERT INTO historical_readings SELECT * FROM df")

    def fetch_uk_carbon_intensity(self) -> List[Dict[str, Any]]:
        """Fetches live 24-48h forecast from the official UK Carbon Intensity API."""
        try:
            url = "https://api.carbonintensity.org.uk/intensity"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                # Also fetch 24h forward
                now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
                url_forward = f"https://api.carbonintensity.org.uk/intensity/{now_str}/forward"
                resp_fwd = requests.get(url_forward, timeout=3)
                if resp_fwd.status_code == 200:
                    fwd_data = resp_fwd.json().get("data", [])
                    if fwd_data:
                        return [
                            {**item, "_tempo_source": "national_grid_live"}
                            for item in fwd_data
                        ]
        except Exception:
            pass
        return self._generate_fallback_carbon_series()

    def fetch_oxford_weather(self) -> Dict[str, Any]:
        """Fetches 48h weather forecast for Oxford from Open-Meteo."""
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={OXFORD_LAT}&longitude={OXFORD_LON}&hourly=temperature_2m,wind_speed_10m,direct_normal_irradiance&timezone=Europe%2FLondon&forecast_days=2"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                hourly = resp.json().get("hourly", {})
                if hourly:
                    return {**hourly, "_tempo_source": "open_meteo_live"}
        except Exception:
            pass
        return self._generate_fallback_weather_series()

    def fetch_octopus_agile_rates(self) -> List[Dict[str, Any]]:
        """Fetches Octopus Agile dynamic half-hourly rates or builds dynamic forecast model."""
        try:
            # Real Octopus Agile API endpoint for Southern England (region C - Oxford/SE)
            url = "https://api.octopus.energy/v1/products/AGILE-24-04-03/electricity-tariffs/E-1R-AGILE-24-04-03-C/standard-unit-rates/"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results and len(results) >= 24:
                    return [
                        {**item, "_tempo_source": "octopus_live"}
                        for item in results
                    ]
        except Exception:
            pass
        return self._generate_fallback_agile_series()

    def _generate_fallback_carbon_series(self) -> List[Dict[str, Any]]:
        now = datetime.datetime.now(datetime.timezone.utc).replace(
            minute=0 if datetime.datetime.now(datetime.timezone.utc).minute < 30 else 30,
            second=0,
            microsecond=0,
        )
        rng = random.Random(int(now.timestamp() // 1800) + 101)
        series = []
        for i in range(48):
            t = now + datetime.timedelta(minutes=30 * i)
            h = t.hour + t.minute / 60.0
            # Higher in evening 16-19, lower late night 01-05
            mix = 140 + 70 * math.sin((h - 10) / 24 * 2 * math.pi)
            if 16 <= h <= 19:
                mix += 60
            elif 1 <= h <= 5:
                mix -= 50
            mix = int(max(40, mix + rng.uniform(-10, 10)))
            index_str = "very low" if mix < 70 else ("low" if mix < 130 else ("moderate" if mix < 210 else "high"))
            series.append({
                "from": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "to": (t + datetime.timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "intensity": {
                    "forecast": mix,
                    "actual": mix if i == 0 else None,
                    "index": index_str
                },
                "_tempo_source": "generated_fallback",
            })
        return series

    def _generate_fallback_weather_series(self) -> Dict[str, Any]:
        now = datetime.datetime.now(datetime.timezone.utc).replace(
            minute=0,
            second=0,
            microsecond=0,
        )
        rng = random.Random(int(now.timestamp() // 3600) + 202)
        times = [(now + datetime.timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(48)]
        temps = [round(11 + 5 * math.sin(i / 24 * 2 * math.pi) + rng.uniform(-0.5, 0.5), 1) for i in range(48)]
        winds = [round(5.5 + 4 * math.sin(i / 18) + rng.uniform(-0.8, 0.8), 1) for i in range(48)]
        irradiance = [round(max(0.0, 500 * math.sin((i % 24 - 6) / 14 * math.pi)), 1) if 6 <= (i % 24) <= 20 else 0.0 for i in range(48)]
        return {
            "time": times,
            "temperature_2m": temps,
            "wind_speed_10m": winds,
            "direct_normal_irradiance": irradiance,
            "_tempo_source": "generated_fallback",
        }

    def _generate_fallback_agile_series(self) -> List[Dict[str, Any]]:
        now = datetime.datetime.now(datetime.timezone.utc).replace(
            minute=0 if datetime.datetime.now(datetime.timezone.utc).minute < 30 else 30,
            second=0,
            microsecond=0,
        )
        rng = random.Random(int(now.timestamp() // 1800) + 303)
        rates = []
        for i in range(48):
            t_from = now + datetime.timedelta(minutes=30 * i)
            t_to = t_from + datetime.timedelta(minutes=30)
            h = t_from.hour + t_from.minute / 60.0
            
            if 16 <= h <= 19:
                rate = 32.4 + 5.5 * math.sin(i)
            elif 1 <= h <= 4.5:
                # Plunge window / low tariff
                rate = 6.8 + 2.2 * math.sin(i)
                # Occasional negative pricing window on night 1
                if 2 <= h <= 3:
                    rate = -1.2 + rng.uniform(0, 2.5)
            elif 12 <= h <= 14:
                rate = 14.2 + 2.0 * rng.random()
            else:
                rate = 19.5 + 3.0 * math.sin(i / 3)
            
            rates.append({
                "value_inc_vat": round(rate, 2),
                "valid_from": t_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "valid_to": t_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "_tempo_source": "generated_fallback",
            })
        return rates

    def query_historical_stats(self) -> Dict[str, Any]:
        """Queries DuckDB analytical metrics for the historical backtesting benchmark."""
        res = self.con.execute("""
            SELECT 
                COUNT(*) as total_slots,
                AVG(spot_price_p) as avg_price,
                MIN(spot_price_p) as min_price,
                MAX(spot_price_p) as max_price,
                AVG(carbon_intensity) as avg_carbon,
                SUM(consumption_kwh) as total_kwh
            FROM historical_readings
        """).fetchone()
        
        return {
            "total_slots": res[0],
            "avg_price_p": round(res[1], 2),
            "min_price_p": round(res[2], 2),
            "max_price_p": round(res[3], 2),
            "avg_carbon_gco2": round(res[4], 1),
            "total_kwh_benchmarked": round(res[5], 1)
        }
