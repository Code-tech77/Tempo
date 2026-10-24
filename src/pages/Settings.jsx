import React from 'react';
import { HOUSEHOLDS } from '../App';

export default function Settings({ household, householdId, setHouseholdId }) {
  return (
    <>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-sub">Manage your household and preferences</div>
      </div>

      {/* ── Household selector ── */}
      <div className="section-label">Your Household</div>
      <div className="card mb-4">
        {HOUSEHOLDS.map(h => (
          <div
            key={h.id}
            onClick={() => setHouseholdId(h.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 0',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{ fontSize: 32, lineHeight: 1 }}>{h.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                {h.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--sub)' }}>
                {h.address} · {h.tariff}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {householdId === h.id ? (
                <span className="badge badge-cyan">Active</span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--sub)' }}>£{h.monthly_bill}/mo</span>
              )}
            </div>
          </div>
        ))}
        <div style={{ paddingBottom: 0 }} />
      </div>

      {/* ── Tariff Info ── */}
      <div className="section-label">Tariff Details</div>
      <div className="card mb-4">
        <div className="appliance-row" style={{ cursor: 'default' }}>
          <div className="appliance-info">
            <div className="appliance-name">Tariff</div>
            <div className="appliance-detail">Dynamic half-hourly pricing</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyan)' }}>{household.tariff}</div>
        </div>
        <div className="appliance-row" style={{ cursor: 'default' }}>
          <div className="appliance-info">
            <div className="appliance-name">Monthly Bill</div>
            <div className="appliance-detail">Average this month</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>£{household.monthly_bill}</div>
        </div>
        <div className="appliance-row" style={{ cursor: 'default', borderBottom: 'none' }}>
          <div className="appliance-info">
            <div className="appliance-name">Saving Rate</div>
            <div className="appliance-detail">vs. unoptimised flat rate</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)' }}>-{household.saving_pct}%</div>
        </div>
      </div>

      {/* ── Appliances ── */}
      <div className="section-label">Registered Appliances</div>
      <div className="card mb-4">
        {household.appliances.map(app => (
          <div key={app.id} className="appliance-row">
            <div className="appliance-icon-wrap">
              <span style={{ fontSize: 20 }}>{app.icon}</span>
            </div>
            <div className="appliance-info">
              <div className="appliance-name">{app.name}</div>
              <div className="appliance-detail">{app.kw} kW rated power</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--sub)' }}>Smart plug ✓</div>
          </div>
        ))}
      </div>

      {/* ── About ── */}
      <div className="section-label">About Tempo</div>
      <div className="card">
        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.7 }}>
          Tempo uses LightGBM quantile regression and 1,000 Monte Carlo simulations to give you
          honest, risk-aware scheduling recommendations — not just guesses. Built at OxHack 2026,
          University of Oxford.
        </div>
        <div className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            OxHack 2026 · Energy &amp; AI Track
          </div>
          <a
            href="https://github.com/Code-tech77/Tempo"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </>
  );
}
