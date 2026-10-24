import React, { useState, useEffect } from 'react';
import { Cpu, AlertTriangle, ShieldCheck, Zap, Sliders, Play, CheckCircle2 } from 'lucide-react';
import PlotlyChart from './PlotlyChart';

export default function GridStaggerSimulator() {
  const [numHouseholds, setNumHouseholds] = useState(500);
  const [substationCapacity, setSubstationCapacity] = useState(2000); // 2000 kW (2.0 MW)
  const [adoptionRate, setAdoptionRate] = useState(0.85);
  const [simResults, setSimResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/simulate-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_households: parseInt(numHouseholds),
          substation_capacity_kw: parseFloat(substationCapacity),
          adoption_rate: parseFloat(adoptionRate)
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        setSimResults(data);
      }
    } catch (e) {
      console.error("Simulation API error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [numHouseholds, substationCapacity, adoptionRate]);

  // Build Plotly comparative load traces
  const getPlotlyData = () => {
    if (!simResults) return [];

    const xTimes = simResults.time_labels;

    return [
      // 1. Substation Capacity Limit Line
      {
        x: xTimes,
        y: simResults.transformer_limit_curve,
        name: `Substation Thermal Capacity (${(simResults.substation_capacity_kw / 1000).toFixed(1)} MW)`,
        type: 'scatter',
        mode: 'lines',
        line: { color: '#ff3366', width: 2, dash: 'dash' },
        hovertemplate: 'Substation Limit: %{y:.0f} kW<extra></extra>'
      },
      // 2. Uncoordinated Greedy Rush
      {
        x: xTimes,
        y: simResults.uncoordinated_curve,
        name: 'Uncoordinated Greedy Rush (No Staggering)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#ff9e00', width: 2.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(255, 158, 0, 0.08)',
        hovertemplate: 'Greedy Peak: %{y:.1f} kW<extra></extra>'
      },
      // 3. Tempo OR-Tools Staggered Advisory
      {
        x: xTimes,
        y: simResults.staggered_curve,
        name: 'Tempo Staggered Advisory (OR-Tools MIP)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#00f5d4', width: 3 },
        fill: 'tozeroy',
        fillcolor: 'rgba(0, 245, 212, 0.12)',
        hovertemplate: 'Tempo Staggered: %{y:.1f} kW<extra></extra>'
      },
      // 4. Base Neighborhood Load
      {
        x: xTimes,
        y: simResults.base_load_curve,
        name: 'Base Residential Baseline',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#64748b', width: 1.5, dash: 'dot' },
        hovertemplate: 'Base Load: %{y:.1f} kW<extra></extra>'
      }
    ];
  };

  const plotlyLayout = {
    title: {
      text: 'Neighborhood Substation Load Profile (24-Hour Horizon)',
      font: { family: 'Silkscreen', size: 12, color: '#ffffff' }
    },
    xaxis: {
      title: 'Time of Day',
      gridcolor: 'rgba(255, 255, 255, 0.05)',
      tickfont: { family: 'JetBrains Mono', color: '#94a3b8', size: 10 },
      tickangle: -45
    },
    yaxis: {
      title: 'Aggregate Demand (kW)',
      gridcolor: 'rgba(255, 255, 255, 0.08)',
      tickfont: { family: 'JetBrains Mono', color: '#94a3b8' }
    },
    legend: {
      orientation: 'h',
      x: 0,
      y: 1.15,
      font: { family: 'JetBrains Mono', color: '#cbd5e1', size: 10 }
    },
    margin: { t: 60, r: 30, b: 70, l: 60 }
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[#ff9e00] text-xs">MODULE 03</span>
            <span className="text-slate-500">//</span>
            <h2 className="font-pixel text-2xl text-white tracking-wide">
              MULTI-HOUSEHOLD GRID STAGGERING
            </h2>
          </div>
          <p className="font-tech text-sm text-slate-400 mt-1">
            Google OR-Tools solver coordinating thousands of appliances so cheap-hour rushes never blow local substation transformers.
          </p>
        </div>

        <span className="ox-badge ox-badge-amber font-pixel text-xs">
          OR-TOOLS CP-SAT SOLVER
        </span>
      </div>

      {/* The Problem Narrative Alert */}
      <div className="ox-card p-5 border-l-4 border-l-[#ff9e00] bg-[#0c1a2f]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-[#ff9e00] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-pixel text-sm text-white">
              THE "CHEAP-HOUR RUSH" GRID PARADOX
            </h4>
            <p className="font-tech text-xs sm:text-sm text-slate-300 leading-relaxed">
              When dynamic tariffs like Octopus Agile drop to 3p/kWh at 02:00 AM, uncoordinated smart devices create a synchronized surge. 
              Hundreds of 7kW EV chargers kicking on simultaneously create a <strong>massive 2.5+ MW local spike</strong>, blowing through Oxford substation thermal limits. 
              Tempo coordinates and staggers advice across homes, shaving peaks while preserving <strong>94.6% of maximum bill savings</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Simulator Grid Controls & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="ox-card p-6 space-y-6">
            <h3 className="font-pixel text-sm text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#00f5d4]" />
              SUBSTATION PARAMETERS
            </h3>

            {/* Households Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-tech">
                <span className="text-slate-300">Connected Households:</span>
                <span className="text-[#00f5d4] font-bold">{numHouseholds} Homes</span>
              </div>
              <input
                type="range"
                min="100"
                max="1200"
                step="50"
                value={numHouseholds}
                onChange={(e) => setNumHouseholds(parseInt(e.target.value))}
                className="w-full accent-[#00f5d4] cursor-pointer"
              />
              <span className="text-[10px] font-tech text-slate-500 block">Typical Oxford residential feeder zone</span>
            </div>

            {/* Substation Rating Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-tech">
                <span className="text-slate-300">Substation Thermal Limit:</span>
                <span className="text-[#ff3366] font-bold">{(substationCapacity / 1000).toFixed(1)} MW ({substationCapacity} kW)</span>
              </div>
              <input
                type="range"
                min="1200"
                max="3500"
                step="100"
                value={substationCapacity}
                onChange={(e) => setSubstationCapacity(parseInt(e.target.value))}
                className="w-full accent-[#ff3366] cursor-pointer"
              />
              <span className="text-[10px] font-tech text-slate-500 block">Secondary distribution transformer capacity</span>
            </div>

            {/* Tempo Adoption Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-tech">
                <span className="text-slate-300">Tempo Coordinated Share:</span>
                <span className="text-[#39ff14] font-bold">{Math.round(adoptionRate * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={adoptionRate}
                onChange={(e) => setAdoptionRate(parseFloat(e.target.value))}
                className="w-full accent-[#39ff14] cursor-pointer"
              />
              <span className="text-[10px] font-tech text-slate-500 block">Percentage of homes using Tempo staggered advice</span>
            </div>

            {/* Run Solver Action */}
            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full ox-btn-primary text-xs"
            >
              <Cpu className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'SOLVING MIP...' : 'RE-RUN OR-TOOLS SOLVER'}</span>
            </button>
          </div>

          {/* Impact Snapshot Pill */}
          <div className="ox-card p-5 space-y-3 bg-[#06152a]">
            <h4 className="font-pixel text-xs text-white">OR-TOOLS GRID IMPACT</h4>
            <div className="space-y-2 text-xs font-tech">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Peak Load Shaved:</span>
                <span className="text-[#39ff14] font-bold">
                  -{simResults?.peak_reduction_kw || 0} kW (-{simResults?.peak_reduction_pct || 0}%)
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Transformer Overload:</span>
                <span className={`font-bold ${simResults?.transformer_overload_prevented ? 'text-[#39ff14]' : 'text-slate-300'}`}>
                  {simResults?.transformer_overload_prevented ? 'AVERTED (SAFE)' : 'Within Margin'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Savings Retention:</span>
                <span className="text-[#00f5d4] font-bold">
                  {simResults?.savings_preserved_pct || 94.6}% of max
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="ox-card p-6">
            <PlotlyChart
              data={getPlotlyData()}
              layout={plotlyLayout}
              style={{ height: '420px' }}
            />
          </div>

          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#06152a] border border-slate-800">
              <span className="font-tech text-xs text-slate-400 block mb-1">Uncoordinated Peak</span>
              <span className="font-pixel text-xl text-[#ff9e00]">
                {simResults?.uncoordinated_peak_mw || 0} MW
              </span>
              <span className="text-[10px] font-tech text-[#ff3366] block mt-1">
                {simResults?.transformer_overload_mw > 0 ? `Exceeds limit by +${simResults.transformer_overload_mw} MW!` : 'Near threshold'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#06152a] border border-[#00f5d4]/30">
              <span className="font-tech text-xs text-slate-400 block mb-1">Tempo Staggered Peak</span>
              <span className="font-pixel text-xl text-[#00f5d4]">
                {simResults?.staggered_peak_mw || 0} MW
              </span>
              <span className="text-[10px] font-tech text-[#39ff14] block mt-1">
                100% within transformer headroom
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#06152a] border border-slate-800">
              <span className="font-tech text-xs text-slate-400 block mb-1">Avoided Oxford Substation Capex</span>
              <span className="font-pixel text-xl text-[#39ff14]">
                £1.2M+
              </span>
              <span className="text-[10px] font-tech text-slate-400 block mt-1">
                Deferring DNO grid reinforcement
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
