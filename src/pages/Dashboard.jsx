import React from 'react';
import { HOUSEHOLDS } from '../App';

// ── helpers ─────────────────────────────────────────────────────────
const statusBadge = (status) => ({
  running:   { label: 'Running',   cls: 'badge-lime'  },
  scheduled: { label: 'Scheduled', cls: 'badge-cyan'  },
  waiting:   { label: 'Waiting',   cls: 'badge-amber' },
  done:      { label: 'Done',      cls: 'badge-muted' },
}[status] || { label: status, cls: 'badge-muted' });

const totalSaved  = (h) => h.appliances.reduce((s, a) => s + a.saving, 0).toFixed(2);
const totalCarbon = (h) => h.appliances.reduce((s, a) => s + a.carbon, 0).toFixed(1);

export default function Dashboard({ household, householdId, setHouseholdId, livePrice, liveCarbon }) {
  const saved  = totalSaved(household);
  const carbon = totalCarbon(household);

  const carbonLabel =
    liveCarbon < 90  ? { txt: 'Very Clean', color: 'var(--lime)'  } :
    liveCarbon < 160 ? { txt: 'Clean',      color: 'var(--cyan)'  } :
    liveCarbon < 240 ? { txt: 'Moderate',   color: 'var(--amber)' } :
    { txt: 'High',   color: 'var(--red)' };

  const nextTask = household.appliances.find(a => a.status === 'scheduled' || a.status === 'waiting');

  return (
    <>
      {/* ── Household Selector ── */}
      <div className="household-selector">
        {HOUSEHOLDS.map(h => (
          <button
            key={h.id}
            onClick={() => setHouseholdId(h.id)}
            className={`household-chip ${householdId === h.id ? 'active' : ''}`}
          >
            <span className="household-chip-avatar">{h.avatar}</span>
            <div style={{ textAlign: 'left' }}>
              <div className="household-chip-name">{h.name}</div>
              <div className="household-chip-saving">-{h.saving_pct}% bill</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Top 4 Stats ── */}
      <div className="grid-4 mb-4">
        <div className="card card-sm">
          <div className="stat-label">Saved Today</div>
          <div className="stat-value lime">£{saved}</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Bill Reduction</div>
          <div className="stat-value cyan">-{household.saving_pct}%</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Spot Price</div>
          <div className="stat-value amber">{livePrice.toFixed(1)}p</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">CO₂ Avoided</div>
          <div className="stat-value" style={{ color: 'var(--teal, #2dd4bf)' }}>{carbon} kg</div>
        </div>
      </div>

      {/* ── Grid Carbon + Next Task row ── */}
      <div className="grid-2 mb-4">
        {/* Carbon Intensity */}
        <div className="card">
          <div className="stat-label">Grid Carbon Intensity</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="stat-value" style={{ color: carbonLabel.color }}>{liveCarbon}</div>
            <div style={{ fontSize: 13, color: 'var(--sub)' }}>gCO₂/kWh</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="progress-track">
              <div className="progress-fill" style={{
                width: `${Math.min((liveCarbon / 400) * 100, 100)}%`,
                background: carbonLabel.color,
              }} />
            </div>
          </div>
          <div className="stat-sub mt-1">{carbonLabel.txt} — {liveCarbon < 160 ? 'Good time to run appliances' : 'Consider delaying'}</div>
        </div>

        {/* Next Scheduled Task */}
        <div className="card">
          <div className="stat-label">Next Scheduled Task</div>
          {nextTask ? (
            <>
              <div className="flex items-center gap-2 mt-2" style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
                <span>{nextTask.icon}</span>
                <span>{nextTask.name}</span>
              </div>
              <div className="stat-sub mt-1">Starts {nextTask.start} · saves £{nextTask.saving.toFixed(2)}</div>
            </>
          ) : (
            <>
              <div className="stat-value mt-2" style={{ color: 'var(--lime)', fontSize: 20 }}>All done ✓</div>
              <div className="stat-sub mt-1">No pending tasks for today</div>
            </>
          )}
        </div>
      </div>

      {/* ── Appliance List ── */}
      <div className="card">
        <div className="section-label">Today's Appliances</div>
        {household.appliances.map(app => {
          const s = statusBadge(app.status);
          return (
            <div key={app.id} className="appliance-row">
              <div className="appliance-icon-wrap">
                <span style={{ fontSize: 20 }}>{app.icon}</span>
              </div>
              <div className="appliance-info">
                <div className="appliance-name">{app.name}</div>
                <div className="appliance-detail">{app.start} → {app.end} · {app.kw} kW</div>
              </div>
              <div className="appliance-right">
                <span className={`badge ${s.cls}`}>{s.label}</span>
                <span className="appliance-saving">+£{app.saving.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
