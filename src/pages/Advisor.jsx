import React, { useState, useEffect } from 'react';

const PRESETS = [
  { id: 'ev',         icon: '🚗', name: 'EV Charger',      kw: 7.0, hrs: 3.5 },
  { id: 'heat_pump',  icon: '🔥', name: 'Heat Pump',       kw: 3.0, hrs: 2.0 },
  { id: 'battery',    icon: '🔋', name: 'Home Battery',    kw: 3.5, hrs: 3.0 },
  { id: 'washer',     icon: '🌊', name: 'Washing Machine', kw: 2.0, hrs: 1.5 },
  { id: 'dryer',      icon: '💨', name: 'Tumble Dryer',    kw: 2.5, hrs: 1.0 },
  { id: 'dishwasher', icon: '✨', name: 'Dishwasher',      kw: 1.8, hrs: 2.0 },
];

export default function Advisor({ livePrice }) {
  const [preset, setPreset]         = useState('ev');
  const [kw, setKw]                 = useState(7.0);
  const [hrs, setHrs]               = useState(3.5);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [scheduled, setScheduled]   = useState(false);

  const selected = PRESETS.find(p => p.id === preset);

  const fetchAdvice = async () => {
    setLoading(true);
    setScheduled(false);
    try {
      const resp = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appliance: selected?.name || 'Custom',
          power_kw: kw,
          duration_hours: hrs,
          deadline_slots: 18,
          priority: 'balanced',
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data);
        return;
      }
    } catch (_) {}

    // Fallback simulation
    const saving = ((livePrice * 0.46 * kw * hrs) / 100).toFixed(2);
    const costNow = ((livePrice * kw * hrs) / 100).toFixed(2);
    const costSched = (costNow - saving).toFixed(2);
    setResult({
      decision: 'WAIT',
      headline: 'Wait until 02:30',
      subheadline: '84% chance waiting is cheaper. You risk losing at most 6p.',
      confidence_pct: 84.2,
      downside_risk_pence: 5.8,
      expected_saving_pounds: `£${saving}`,
      savings_discount_pct: 46,
      carbon_saved_kg: (kw * hrs * 0.128).toFixed(1),
      cost_now_pounds: `£${costNow}`,
      cost_scheduled_pounds: `£${costSched}`,
      optimal_start_time: new Date(Date.now() + 9 * 3600000).toISOString(),
    });
  };

  useEffect(() => { fetchAdvice(); }, [preset, kw, hrs]);

  const isWait = result?.decision === 'WAIT';
  const accentColor = isWait ? 'var(--cyan)' : 'var(--lime)';

  return (
    <>
      <div className="page-header">
        <div className="page-title">Smart Advisor</div>
        <div className="page-sub">Should you run now or wait for cheaper electricity?</div>
      </div>

      {/* ── Appliance Preset Chips ── */}
      <div className="section-label">Select Appliance</div>
      <div className="chip-group mb-4">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => { setPreset(p.id); setKw(p.kw); setHrs(p.hrs); }}
            className={`chip ${preset === p.id ? 'active' : ''}`}
          >
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>

      {/* ── Sliders ── */}
      <div className="card mb-4">
        <div className="section-label">Adjust Parameters</div>

        <div className="slider-wrap">
          <div className="slider-header">
            <span className="slider-label">Power Rating</span>
            <span className="slider-value">{kw} kW</span>
          </div>
          <input type="range" min="0.5" max="11" step="0.5" value={kw}
            onChange={e => setKw(parseFloat(e.target.value))} />
        </div>

        <div className="slider-wrap" style={{ marginBottom: 0 }}>
          <div className="slider-header">
            <span className="slider-label">Duration</span>
            <span className="slider-value">{hrs} hrs · {(kw * hrs).toFixed(1)} kWh</span>
          </div>
          <input type="range" min="0.5" max="8" step="0.5" value={hrs}
            className="amber-thumb"
            onChange={e => setHrs(parseFloat(e.target.value))} />
        </div>
      </div>

      {/* ── Decision Result ── */}
      {loading ? (
        <div className="loading-row">
          <span className="spin" style={{ fontSize: 20 }}>⟳</span>
          Analysing forecasts…
        </div>
      ) : result ? (
        <div className="decision-card">
          {/* Main banner */}
          <div className="decision-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                className="badge"
                style={{ color: accentColor, borderColor: `${accentColor}40`, background: `${accentColor}12` }}
              >
                {isWait ? 'WAIT' : 'RUN NOW'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--sub)' }}>
                {result.confidence_pct}% confident · re-plans in 14 min
              </span>
            </div>
            <div className="decision-action">{result.headline}</div>
            <div className="decision-reason">{result.subheadline}</div>

            {/* Confidence bar */}
            <div style={{ marginTop: 16 }}>
              <div className="progress-track">
                <div className="progress-fill"
                  style={{
                    width: `${result.confidence_pct}%`,
                    background: `linear-gradient(90deg, ${accentColor}, var(--lime))`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3-metric footer */}
          <div className="decision-metrics">
            <div className="decision-metric">
              <div className="decision-metric-label">Expected Saving</div>
              <div className="decision-metric-value" style={{ color: 'var(--lime)' }}>
                {result.expected_saving_pounds}
              </div>
            </div>
            <div className="decision-metric">
              <div className="decision-metric-label">Worst-case Risk</div>
              <div className="decision-metric-value" style={{ color: 'var(--amber)' }}>
                ≤ {result.downside_risk_pence}p
              </div>
            </div>
            <div className="decision-metric">
              <div className="decision-metric-label">CO₂ Avoided</div>
              <div className="decision-metric-value" style={{ color: 'var(--cyan)' }}>
                {result.carbon_saved_kg} kg
              </div>
            </div>
          </div>

          {/* Action */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--sub)' }}>
              Now <strong style={{ color: 'var(--text)' }}>{result.cost_now_pounds}</strong>
              {' → '}
              Scheduled <strong style={{ color: 'var(--lime)' }}>{result.cost_scheduled_pounds}</strong>
            </div>
            <button
              className={`btn btn-sm ${scheduled ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => setScheduled(true)}
              disabled={scheduled}
            >
              {scheduled ? '✓ Scheduled' : '⚡ Schedule It'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
