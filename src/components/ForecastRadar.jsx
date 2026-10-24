import React, { useState, useEffect } from 'react';
import { LineChart, Wind, Sun, Zap, Activity, Info, Eye, EyeOff } from 'lucide-react';
import PlotlyChart from './PlotlyChart';

export default function ForecastRadar() {
  const [forecastData, setForecastData] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tariffMode, setTariffMode] = useState('agile'); // 'agile', 'tracker', 'flat'
  const [showQuantiles, setShowQuantiles] = useState(true);
  const [showCarbon, setShowCarbon] = useState(true);
  const [showWeather, setShowWeather] = useState(true);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/forecast');
      if (resp.ok) {
        const json = await resp.json();
        setForecastData(json.forecast || []);
        setWeatherData(json.weather || null);
      }
    } catch (e) {
      console.error("Forecast fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  // Format Plotly series
  const getPlotlyData = () => {
    if (!forecastData.length) return [];

    const xTimes = forecastData.map(s => {
      const d = new Date(s.valid_from);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const traces = [];

    // 1. Quantile Ribbon (p10 and p90)
    if (showQuantiles && tariffMode === 'agile') {
      traces.push({
        x: xTimes,
        y: forecastData.map(s => s.p90),
        name: 'p90 Risk Ceiling',
        type: 'scatter',
        mode: 'lines',
        line: { width: 0 },
        showlegend: false,
        hoverinfo: 'none'
      });

      traces.push({
        x: xTimes,
        y: forecastData.map(s => s.p10),
        name: 'Quantile Confidence Band (p10 - p90)',
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        fillcolor: 'rgba(0, 245, 212, 0.12)',
        line: { width: 0 },
        hoverinfo: 'none'
      });
    }

    // 2. Primary Price Curve
    let priceValues = forecastData.map(s => s.spot_rate);
    if (tariffMode === 'flat') {
      priceValues = forecastData.map(() => 27.5); // Standard variable cap
    } else if (tariffMode === 'tracker') {
      priceValues = forecastData.map(s => Math.round((s.spot_rate * 0.7 + 6.0) * 10) / 10);
    }

    traces.push({
      x: xTimes,
      y: priceValues,
      name: `Electricity Price (${tariffMode.toUpperCase()})`,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#00f5d4', width: 3 },
      marker: { size: 5, color: '#39ff14' },
      hovertemplate: '%{x}<br>Price: %{y:.1f}p/kWh<extra></extra>',
      yaxis: 'y1'
    });

    // 3. Carbon Intensity Curve
    if (showCarbon) {
      traces.push({
        x: xTimes,
        y: forecastData.map(s => s.carbon_intensity),
        name: 'UK Carbon Intensity',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#ff9e00', width: 2, dash: 'dot' },
        hovertemplate: '%{x}<br>Carbon: %{y} gCO₂/kWh<extra></extra>',
        yaxis: 'y2'
      });
    }

    // 4. Wind Speed
    if (showWeather) {
      traces.push({
        x: xTimes,
        y: forecastData.map(s => s.wind_ms),
        name: 'Oxford Wind Speed (m/s)',
        type: 'bar',
        opacity: 0.25,
        marker: { color: '#00b4d8' },
        hovertemplate: '%{x}<br>Wind: %{y} m/s<extra></extra>',
        yaxis: 'y3'
      });
    }

    return traces;
  };

  const plotlyLayout = {
    title: {
      text: '24-48h Half-Hourly Multitrack Horizon (Octopus Agile & National Carbon Intensity)',
      font: { family: 'Silkscreen', size: 12, color: '#ffffff' }
    },
    xaxis: {
      title: 'Time (Oxford, UK)',
      gridcolor: 'rgba(255, 255, 255, 0.05)',
      tickfont: { family: 'JetBrains Mono', color: '#94a3b8', size: 10 },
      tickangle: -45
    },
    yaxis: {
      title: 'Electricity Tariff (p/kWh)',
      titlefont: { color: '#00f5d4' },
      tickfont: { family: 'JetBrains Mono', color: '#00f5d4' },
      gridcolor: 'rgba(0, 245, 212, 0.08)'
    },
    yaxis2: {
      title: 'Carbon Intensity (gCO₂/kWh)',
      titlefont: { color: '#ff9e00' },
      tickfont: { family: 'JetBrains Mono', color: '#ff9e00' },
      overlaying: 'y',
      side: 'right',
      gridcolor: 'transparent'
    },
    yaxis3: {
      title: 'Wind (m/s)',
      visible: false,
      overlaying: 'y',
      side: 'right',
      range: [0, 45]
    },
    legend: {
      orientation: 'h',
      x: 0,
      y: 1.15,
      font: { family: 'JetBrains Mono', color: '#cbd5e1', size: 10 }
    },
    margin: { t: 60, r: 60, b: 70, l: 60 }
  };

  // Find lowest price window
  const lowestSlot = forecastData.length 
    ? [...forecastData].sort((a, b) => a.spot_rate - b.spot_rate)[0] 
    : null;

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[#39ff14] text-xs">MODULE 02</span>
            <span className="text-slate-500">//</span>
            <h2 className="font-pixel text-2xl text-white tracking-wide">
              24-48 HOUR FORECAST RADAR
            </h2>
          </div>
          <p className="font-tech text-sm text-slate-400 mt-1">
            Synchronized Octopus Agile pricing curve, LightGBM quantile regression bands, and UK National Grid ESO carbon mix.
          </p>
        </div>

        {/* Tariff Mode Toggle */}
        <div className="flex items-center gap-2 bg-[#06152a] p-1.5 rounded-lg border border-slate-700">
          <span className="text-xs font-tech text-slate-400 px-2">Tariff:</span>
          {[
            { id: 'agile', label: 'Octopus Agile' },
            { id: 'tracker', label: 'Tracker' },
            { id: 'flat', label: 'Standard Flat' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTariffMode(t.id)}
              className={`px-3 py-1 rounded text-xs font-tech transition cursor-pointer ${
                tariffMode === t.id
                  ? 'bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layer Toggles & Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Toggle Pills */}
        <div className="md:col-span-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowQuantiles(!showQuantiles)}
            className={`ox-btn-secondary text-xs ${showQuantiles ? 'border-[#00f5d4] text-[#00f5d4]' : 'opacity-60'}`}
          >
            {showQuantiles ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Quantile Bands (p10 / p90)</span>
          </button>

          <button
            onClick={() => setShowCarbon(!showCarbon)}
            className={`ox-btn-secondary text-xs ${showCarbon ? 'border-[#ff9e00] text-[#ff9e00]' : 'opacity-60'}`}
          >
            {showCarbon ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>UK Carbon Intensity</span>
          </button>

          <button
            onClick={() => setShowWeather(!showWeather)}
            className={`ox-btn-secondary text-xs ${showWeather ? 'border-[#00b4d8] text-[#00b4d8]' : 'opacity-60'}`}
          >
            {showWeather ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Oxford Wind & Solar</span>
          </button>
        </div>

        {/* Greenest/Cheapest Window Callout */}
        <div className="md:col-span-4 bg-[#06152a] p-3 rounded-xl border border-[#39ff14]/30 flex items-center justify-between">
          <div>
            <span className="font-tech text-[10px] text-slate-400 block">LOWEST RATE WINDOW</span>
            <span className="font-pixel text-sm text-[#39ff14]">
              {lowestSlot ? new Date(lowestSlot.valid_from).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '02:30 AM'}
            </span>
          </div>
          <span className="font-pixel text-lg text-white">
            {lowestSlot?.spot_rate.toFixed(1)}p <span className="text-xs text-slate-400">/kWh</span>
          </span>
        </div>
      </div>

      {/* Main Plotly Horizon Chart */}
      <div className="ox-card p-6">
        <PlotlyChart
          data={getPlotlyData()}
          layout={plotlyLayout}
          style={{ height: '420px' }}
        />
      </div>

      {/* Real API Data Badges & Sources */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-tech text-xs">
        <div className="p-3 rounded-lg bg-[#040e1d] border border-slate-800 flex items-center gap-3">
          <Zap className="w-5 h-5 text-[#00f5d4]" />
          <div>
            <span className="text-white font-bold block">Octopus Agile Public API</span>
            <span className="text-slate-400 text-[11px]">Region C (Oxford / SE England)</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#040e1d] border border-slate-800 flex items-center gap-3">
          <Activity className="w-5 h-5 text-[#ff9e00]" />
          <div>
            <span className="text-white font-bold block">UK Carbon Intensity API</span>
            <span className="text-slate-400 text-[11px]">Official National Grid ESO Model</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#040e1d] border border-slate-800 flex items-center gap-3">
          <Wind className="w-5 h-5 text-[#00b4d8]" />
          <div>
            <span className="text-white font-bold block">Open-Meteo Weather API</span>
            <span className="text-slate-400 text-[11px]">Lat 51.7520, Lon -1.2577 (Oxford)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
