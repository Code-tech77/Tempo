import React from 'react';
import { ArrowRight, ShieldCheck, Zap, TrendingDown, Cpu, Sparkles } from 'lucide-react';

export default function HeroSection({ onExploreAppliance, onExploreGrid, onMyHome }) {
  return (
    <section className="relative overflow-hidden py-12 lg:py-16 border-b border-[#00f5d4]/15">
      {/* Circuit and Glow Ambient Backdrops */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00f5d4]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-10 w-96 h-96 bg-[#ff9e00]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* OxHack Showcase Header Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a1f3d] border border-[#00f5d4]/40 mb-6">
          <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-ping"></span>
          <span className="font-pixel text-[11px] text-[#00f5d4] tracking-wider">
            OXHACK 2026 // ENERGY & AI TRACK
          </span>
          <span className="text-slate-400 font-tech text-xs">·</span>
          <span className="text-slate-300 font-tech text-xs">University of Oxford</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Mission & Value Proposition */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Decide with Confidence. <br />
              <span className="text-ox-gradient">Run Now or Wait?</span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-light">
              Tempo turns time-stamped energy tariffs, UK National Grid carbon intensity, and weather forecasts into <strong className="text-white font-medium">honest, risk-aware decisions</strong>. 
              Instead of deterministic false certainty, it quantifies each recommendation with an explicit probability and downside risk:
            </p>

            {/* Signature Quote Callout */}
            <div className="p-4 rounded-xl bg-[#061833]/90 border-l-4 border-[#00f5d4] border-t border-r border-b border-slate-700/50 shadow-lg">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-[#00f5d4] shrink-0 mt-0.5" />
                <div>
                  <p className="font-tech text-sm sm:text-base font-semibold text-white">
                    "84% chance waiting is cheaper — you risk losing at most 6p."
                  </p>
                  <p className="font-tech text-xs text-slate-400 mt-1">
                    LightGBM Quantile Regression + NumPy 1,000 Monte Carlo simulations with continuous auction re-planning.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button onClick={onMyHome} className="ox-btn-primary" style={{ background: 'linear-gradient(135deg, rgba(0,245,212,0.15), rgba(45,212,191,0.1))' }}>
                <span>🏠 My Home View</span>
              </button>

              <button onClick={onExploreAppliance} className="ox-btn-secondary">
                <span>⚡ Decision Engine</span>
                <ArrowRight className="w-4 h-4 text-[#00f5d4]" />
              </button>

              <button onClick={onExploreGrid} className="ox-btn-secondary">
                <Cpu className="w-4 h-4 text-[#39ff14]" />
                <span>OR-Tools Grid</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Visual Graphic / OxHack Styled Display */}
          <div className="lg:col-span-5">
            <div className="relative group">
              {/* Glowing decorative frame */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00f5d4] via-[#39ff14] to-[#ff9e00] rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>

              <div className="relative rounded-2xl bg-[#081a33] border border-[#00f5d4]/40 p-6 shadow-2xl space-y-5">
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                  <div className="flex items-center gap-3">
                    <img src="/oxhack-logo.png" alt="OxHack" className="w-8 h-10 object-contain" />
                    <div>
                      <span className="font-pixel text-xs text-white tracking-wider block">
                        OXHACK_TELEMETRY.SYS
                      </span>
                      <span className="font-tech text-[10px] text-[#00f5d4]">
                        NODE: OXFORD_SUB_48
                      </span>
                    </div>
                  </div>
                  <span className="ox-badge ox-badge-green font-pixel text-[10px]">
                    OPTIMAL_SAVINGS
                  </span>
                </div>

                {/* Live Sample Decision Card */}
                <div className="p-4 rounded-xl bg-[#040e1d] border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-tech text-slate-400">
                    <span>APPLIANCE TARGET</span>
                    <span className="text-[#ff9e00] font-bold">TESLA EV (7.0 kW / 3h)</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-tech text-slate-400 block">CURRENT ADVICE</span>
                      <span className="font-pixel text-xl sm:text-2xl text-[#00f5d4]">
                        WAIT UNTIL 02:30 AM
                      </span>
                    </div>
                    <span className="font-tech text-xs text-[#39ff14] bg-[#39ff14]/10 px-2 py-1 rounded border border-[#39ff14]/30">
                      -46% BILL CUT
                    </span>
                  </div>

                  {/* Confidence Probability Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-tech">
                      <span className="text-slate-300">Cheaper Probability</span>
                      <span className="text-[#00f5d4] font-bold">84.2%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00f5d4] via-[#39ff14] to-[#ff9e00] transition-all duration-1000"
                        style={{ width: '84.2%' }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-tech">
                    <div className="bg-[#081a33] p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">WORST-CASE DOWNSIDE</span>
                      <span className="text-[#39ff14] font-bold">Lose ≤ 6p</span>
                    </div>
                    <div className="bg-[#081a33] p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">CARBON AVOIDED</span>
                      <span className="text-[#00f5d4] font-bold">1.2 kg CO₂e</span>
                    </div>
                  </div>
                </div>

                {/* Substation Warning Solved */}
                <div className="flex items-center justify-between text-xs font-tech text-slate-300 px-3 py-2 bg-[#0a2347]/60 rounded-lg border border-[#00f5d4]/20">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-[#39ff14]"></span>
                    Neighborhood Peak Shaved:
                  </span>
                  <span className="text-[#39ff14] font-bold">
                    480 kW Protected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Bottom Key Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-slate-800/80">
          <div className="ox-card p-4">
            <span className="font-tech text-xs text-slate-400 block mb-1">Average Bill Discount</span>
            <div className="flex items-baseline gap-2">
              <span className="font-pixel text-2xl text-[#39ff14]">46.2%</span>
              <span className="text-xs text-slate-400 font-tech">vs peak</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-tech">Based on Agile half-hourly plunge rates</p>
          </div>

          <div className="ox-card p-4">
            <span className="font-tech text-xs text-slate-400 block mb-1">Clean Energy Mix</span>
            <div className="flex items-baseline gap-2">
              <span className="font-pixel text-2xl text-[#00f5d4]">68.4%</span>
              <span className="text-xs text-slate-400 font-tech">wind & solar</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-tech">UK National Grid ESO real forecasting</p>
          </div>

          <div className="ox-card p-4">
            <span className="font-tech text-xs text-slate-400 block mb-1">Downside Regret Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="font-pixel text-2xl text-[#ff9e00]">&lt; 2.1%</span>
              <span className="text-xs text-slate-400 font-tech">of runs</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-tech">Mean regret penalty bounded to &lt;4p</p>
          </div>

          <div className="ox-card p-4">
            <span className="font-tech text-xs text-slate-400 block mb-1">Grid Overload Safeguard</span>
            <div className="flex items-baseline gap-2">
              <span className="font-pixel text-2xl text-white">0 MW</span>
              <span className="text-xs text-[#39ff14] font-tech font-bold">Violations</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-tech">Google OR-Tools multi-home staggering</p>
          </div>
        </div>
      </div>
    </section>
  );
}
