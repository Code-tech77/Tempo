import React from 'react';
import { Zap, Activity, Wind, Clock, RefreshCw, Cpu, Layers } from 'lucide-react';

export default function Navbar({ gridStatus, onRefresh, activeTab, setActiveTab, isRefreshing }) {
  const currentPrice = gridStatus?.current_price_pence_kwh ?? 16.4;
  const currentCarbon = gridStatus?.current_carbon_gco2_kwh ?? 128;
  const windSpeed = gridStatus?.oxford_wind_speed_ms ?? 6.8;

  const getCarbonBadge = (gco2) => {
    if (gco2 < 90) return { label: 'Very Clean', color: 'ox-badge-green' };
    if (gco2 < 160) return { label: 'Clean', color: 'ox-badge-cyan' };
    if (gco2 < 240) return { label: 'Moderate', color: 'ox-badge-amber' };
    return { label: 'High Carbon', color: 'ox-badge-red' };
  };

  const carbonBadge = getCarbonBadge(currentCarbon);

  const navItems = [
    { id: 'decision', label: 'Appliance Advisor' },
    { id: 'radar', label: '24-48h Radar' },
    { id: 'grid', label: 'Grid Staggering (OR-Tools)' },
    { id: 'backtest', label: 'Historical Backtest' },
    { id: 'tech', label: 'Architecture & API' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#040d1a]/90 backdrop-blur-md border-b border-[#00f5d4]/20 shadow-lg shadow-black/40">
      {/* Top OxHack Hackathon Banner Stripe */}
      <div className="bg-gradient-to-r from-[#00f5d4]/15 via-[#39ff14]/10 to-[#ff9e00]/15 border-b border-[#00f5d4]/10 px-4 py-1 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[#00f5d4] text-[10px] tracking-wider">OXHACK 2026</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 font-tech text-[11px] hidden sm:inline">
            Oxford's Student-Led Hackathon Project
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse"></span>
          <span className="text-slate-400 text-[11px]">Substation: Oxford North (SP Manweb)</span>
        </div>
        <div className="flex items-center gap-3 font-tech text-[11px] text-slate-300">
          <span className="text-[#00f5d4] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] pulse-radar"></span>
            Re-plan Auction Engine: Active
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('decision')}>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00f5d4] via-[#39ff14] to-[#ff9e00] rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-300"></div>
            <img
              src="/oxhack-logo.png"
              alt="OxHack Logo"
              className="relative w-12 h-14 object-contain filter drop-shadow-[0_0_8px_rgba(0,245,212,0.4)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-2xl font-bold text-white tracking-widest">
                TEMPO
              </span>
              <span className="font-pixel text-[9px] px-1.5 py-0.5 rounded bg-[#06152a] text-[#00f5d4] border border-[#00f5d4]/40">
                0x4f
              </span>
            </div>
            <p className="font-tech text-xs text-slate-400 tracking-tight">
              Honest, Risk-Aware Energy Scheduling
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#06152a]/80 p-1.5 rounded-lg border border-[#00f5d4]/15">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded text-xs font-tech transition-all duration-200 cursor-pointer ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-[#00f5d4]/20 to-[#39ff14]/20 text-[#00f5d4] border border-[#00f5d4]/40 font-bold shadow-[0_0_12px_rgba(0,245,212,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Live Grid Signals & Refresh */}
        <div className="flex items-center gap-3">
          {/* Price Pill */}
          <div className="hidden sm:flex flex-col items-end px-3 py-1.5 bg-[#06152a] rounded-lg border border-slate-700/60">
            <span className="text-[10px] font-tech text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#ff9e00]" />
              Agile Spot Rate
            </span>
            <span className="font-tech text-sm font-bold text-[#ff9e00]">
              {currentPrice.toFixed(1)}p <span className="text-[10px] text-slate-400">/kWh</span>
            </span>
          </div>

          {/* Carbon Pill */}
          <div className="hidden md:flex flex-col items-end px-3 py-1.5 bg-[#06152a] rounded-lg border border-slate-700/60">
            <span className="text-[10px] font-tech text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#00f5d4]" />
              National Carbon
            </span>
            <span className="font-tech text-sm font-bold text-[#00f5d4]">
              {currentCarbon} <span className="text-[10px] text-slate-400">gCO₂/kWh</span>
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Live API Grid Data"
            disabled={isRefreshing}
            className="p-2.5 rounded-lg bg-[#06152a] hover:bg-[#0f274a] border border-[#00f5d4]/30 text-[#00f5d4] transition duration-150 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex overflow-x-auto gap-2 px-4 py-2 bg-[#040d1a] border-t border-slate-800 scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap px-3 py-1 rounded text-xs font-tech cursor-pointer ${
              activeTab === item.id
                ? 'bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}
