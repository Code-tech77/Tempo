import React, { useState } from 'react';
import { X, Zap, CheckCircle2, Copy, Send, Radio } from 'lucide-react';

export default function AutomationModal({ isOpen, onClose, recommendation }) {
  if (!isOpen) return null;

  const [platform, setPlatform] = useState('homeassistant');
  const [dispatched, setDispatched] = useState(false);

  const platforms = [
    { id: 'homeassistant', name: 'Home Assistant Webhook' },
    { id: 'shelly', name: 'Shelly Cloud Gen3 Plug' },
    { id: 'smartthings', name: 'Samsung SmartThings' },
    { id: 'octopus', name: 'Octopus Agile IFTTT / Zapier' }
  ];

  const handleDispatch = () => {
    setDispatched(true);
    setTimeout(() => {
      // auto close or keep open
    }, 2500);
  };

  const payload = {
    event: "TEMPO_SCHEDULE_APPLIANCE",
    appliance: recommendation?.appliance || "EV Charger",
    optimal_start_utc: recommendation?.optimal_start_time || "2026-10-25T02:30:00Z",
    confidence_probability: `${recommendation?.confidence_pct || 84}%`,
    downside_risk_max_loss: `${recommendation?.downside_risk_pence || 6}p`,
    expected_savings: recommendation?.expected_saving_pounds || "£1.84",
    replan_subscriber_id: "tempo_oxford_sub_48"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="ox-card p-6 max-w-lg w-full space-y-5 bg-[#06152a] border-[#00f5d4]/40 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4]">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-pixel text-lg text-white">
              DISPATCH AUTOMATION
            </h3>
            <p className="font-tech text-xs text-slate-400">
              Trigger smart plug / relay at the optimal risk-aware window
            </p>
          </div>
        </div>

        {/* Target Details */}
        <div className="p-3.5 rounded-xl bg-[#040e1d] border border-slate-800 space-y-2 font-tech text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Target Appliance:</span>
            <span className="text-white font-bold">{recommendation?.appliance}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Optimal Start Time:</span>
            <span className="text-[#00f5d4] font-bold">
              {recommendation?.optimal_start_time ? new Date(recommendation.optimal_start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '02:30 AM'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Honest Confidence:</span>
            <span className="text-[#39ff14] font-bold">{recommendation?.confidence_pct}% Cheaper</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Downside Risk:</span>
            <span className="text-[#ff9e00] font-bold">Risk losing ≤ {recommendation?.downside_risk_pence}p</span>
          </div>
        </div>

        {/* Platform Radio Options */}
        <div className="space-y-2">
          <label className="font-tech text-xs text-slate-300 block">Integration Target Platform:</label>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`p-2.5 rounded-lg border text-left font-tech text-xs transition cursor-pointer ${
                  platform === p.id
                    ? 'bg-[#00f5d4]/15 border-[#00f5d4] text-[#00f5d4] font-bold'
                    : 'bg-[#040e1d] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Webhook JSON Preview */}
        <div className="p-3 rounded-lg bg-[#02070f] border border-slate-900 font-tech text-[11px] text-[#00f5d4] overflow-x-auto max-h-32">
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="ox-btn-secondary text-xs"
          >
            Cancel
          </button>

          <button
            onClick={handleDispatch}
            disabled={dispatched}
            className="ox-btn-primary text-xs"
          >
            {dispatched ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#39ff14]" />
                <span>DISPATCHED TO {platform.toUpperCase()}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#00f5d4]" />
                <span>SEND AUTOMATION WEBHOOK</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
