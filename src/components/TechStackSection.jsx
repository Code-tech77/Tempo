import React, { useState } from 'react';
import { 
  Terminal, Server, Cpu, Database, Layout, Code2, 
  ExternalLink, Check, Copy, Play, ArrowRight, Zap 
} from 'lucide-react';

export default function TechStackSection() {
  const [activeEndpoint, setActiveEndpoint] = useState('/api/status');
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const endpoints = [
    {
      id: '/api/status',
      method: 'GET',
      label: 'Live Grid Status',
      desc: 'Current Octopus Agile spot rate, Oxford weather, and National Grid ESO carbon'
    },
    {
      id: '/api/forecast',
      method: 'GET',
      label: '24-48h Quantile Forecast',
      desc: 'Half-hourly horizons with p10, p50, and p90 quantile predictions'
    },
    {
      id: '/api/recommend',
      method: 'POST',
      label: 'Appliance Decision Engine',
      desc: 'Monte Carlo 1,000 path simulation with honest probability and worst-case risk',
      body: {
        appliance: "Tesla EV Charger",
        power_kw: 7.0,
        duration_hours: 3.5,
        deadline_slots: 24,
        priority: "balanced"
      }
    },
    {
      id: '/api/simulate-grid',
      method: 'POST',
      label: 'OR-Tools Neighborhood Staggering',
      desc: 'Multi-household peak-shaving solver protecting Oxford distribution substation',
      body: {
        num_households: 500,
        substation_capacity_kw: 2000.0,
        adoption_rate: 0.85
      }
    },
    {
      id: '/api/backtest',
      method: 'GET',
      label: 'DuckDB Historical Backtest',
      desc: 'Empirical 30-day bill savings, regret frequency, and carbon abatement'
    }
  ];

  const triggerApi = async (ep) => {
    setApiLoading(true);
    try {
      let resp;
      if (ep.method === 'GET') {
        resp = await fetch(ep.id);
      } else {
        resp = await fetch(ep.id, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ep.body || {})
        });
      }
      const data = await resp.json();
      setApiResponse(data);
    } catch (e) {
      setApiResponse({ error: e.message });
    } finally {
      setApiLoading(false);
    }
  };

  const copyJson = () => {
    if (apiResponse) {
      navigator.clipboard.writeText(JSON.stringify(apiResponse, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[#00f5d4] text-xs">MODULE 05</span>
            <span className="text-slate-500">//</span>
            <h2 className="font-pixel text-2xl text-white tracking-wide">
              TECH STACK & LIVE API EXPLORER
            </h2>
          </div>
          <p className="font-tech text-sm text-slate-400 mt-1">
            Production-grade stack engineered for high throughput, free-tier resilience, and mathematically rigorous optimization.
          </p>
        </div>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="ox-btn-secondary text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#00f5d4]" />
          <span>Interactive Swagger Docs</span>
        </a>
      </div>

      {/* Architecture Flow Pipeline */}
      <div className="ox-card p-6 space-y-4">
        <h3 className="font-pixel text-xs text-white">END-TO-END DATA & OPTIMIZATION PIPELINE</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#040e1d] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-[#00f5d4] font-pixel text-xs">
              <span className="w-5 h-5 rounded bg-[#00f5d4]/10 flex items-center justify-center font-bold">1</span>
              DATA INGESTION
            </div>
            <p className="font-tech text-xs text-slate-300">
              Free public APIs: Octopus Agile dynamic pricing, UK Carbon Intensity API, and Open-Meteo Oxford weather.
            </p>
            <span className="inline-block text-[10px] font-tech text-[#00f5d4] bg-[#00f5d4]/10 px-2 py-0.5 rounded">
              Zero API Cost
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#040e1d] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-[#39ff14] font-pixel text-xs">
              <span className="w-5 h-5 rounded bg-[#39ff14]/10 flex items-center justify-center font-bold">2</span>
              PROBABILISTIC ML
            </div>
            <p className="font-tech text-xs text-slate-300">
              LightGBM quantile regression (p10, p50, p90) & NumPy Monte Carlo 1,000 simulations calculating downside tail risk.
            </p>
            <span className="inline-block text-[10px] font-tech text-[#39ff14] bg-[#39ff14]/10 px-2 py-0.5 rounded">
              Quantile Loss
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#040e1d] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-[#ff9e00] font-pixel text-xs">
              <span className="w-5 h-5 rounded bg-[#ff9e00]/10 flex items-center justify-center font-bold">3</span>
              GRID SCHEDULING
            </div>
            <p className="font-tech text-xs text-slate-300">
              Google OR-Tools MIP solver coordinating hundreds of households to prevent local distribution transformer overloads.
            </p>
            <span className="inline-block text-[10px] font-tech text-[#ff9e00] bg-[#ff9e00]/10 px-2 py-0.5 rounded">
              CP-SAT Engine
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#040e1d] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-[#ff3366] font-pixel text-xs">
              <span className="w-5 h-5 rounded bg-[#ff3366]/10 flex items-center justify-center font-bold">4</span>
              ANALYTICS & CLIENT
            </div>
            <p className="font-tech text-xs text-slate-300">
              DuckDB in-process columnar queries + React, Vite, and Plotly data dashboards styled with the OxHack theme.
            </p>
            <span className="inline-block text-[10px] font-tech text-[#ff3366] bg-[#ff3366]/10 px-2 py-0.5 rounded">
              Vercel + Render
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Live API Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Selector */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="font-pixel text-xs text-white">SELECT API ENDPOINT TO TEST</h3>
          {endpoints.map((ep) => {
            const isSelected = activeEndpoint === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => {
                  setActiveEndpoint(ep.id);
                  triggerApi(ep);
                }}
                className={`w-full p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#00f5d4]/15 border-[#00f5d4] text-white shadow-[0_0_12px_rgba(0,245,212,0.2)]'
                    : 'bg-[#06152a] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-tech text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ep.method === 'GET' ? 'bg-[#00f5d4]/20 text-[#00f5d4]' : 'bg-[#ff9e00]/20 text-[#ff9e00]'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="font-bold text-white">{ep.id}</span>
                  </div>
                  <Play className={`w-3.5 h-3.5 ${isSelected ? 'text-[#00f5d4]' : 'text-slate-500'}`} />
                </div>
                <p className="font-tech text-xs text-slate-400">{ep.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Live Terminal Output */}
        <div className="lg:col-span-7">
          <div className="ox-card p-4 space-y-3 bg-[#040d1a] border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 font-tech text-xs text-slate-400">
                <Terminal className="w-4 h-4 text-[#00f5d4]" />
                <span>FastAPI Live Response Terminal</span>
              </div>
              <button
                onClick={copyJson}
                disabled={!apiResponse}
                className="ox-btn-secondary text-xs py-1 px-2.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#39ff14]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY JSON'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto max-h-[380px] p-3 rounded-lg bg-[#02070f] font-tech text-xs text-slate-300 border border-slate-900 scrollbar-thin">
              {apiLoading ? (
                <div className="flex items-center gap-2 text-[#00f5d4] p-4">
                  <span className="animate-spin">⏳</span>
                  <span>Executing request on FastAPI backend...</span>
                </div>
              ) : apiResponse ? (
                <pre className="text-[#00f5d4]">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 p-4">
                  Click any endpoint on the left to execute live HTTP requests against the FastAPI server.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
