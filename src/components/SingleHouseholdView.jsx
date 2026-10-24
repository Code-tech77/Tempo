import React, { useState } from 'react';
import { 
  Home, Car, Flame, BatteryCharging, Waves, Wind, Sparkles,
  Clock, Leaf, PoundSterling, TrendingDown, Zap, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Sun, Moon, Sunrise, Sunset
} from 'lucide-react';

const HOUSEHOLD_PROFILES = [
  {
    id: 'h001',
    name: 'The Patel Family',
    address: '14 Cowley Road, Oxford',
    avatar: '👨‍👩‍👧‍👦',
    tariff: 'Octopus Agile',
    monthly_bill: '£82',
    saving_pct: 38,
    appliances: [
      { 
        id: 'ev', name: 'EV Charger', icon: Car, power_kw: 7.0, 
        status: 'scheduled', start: '02:30', end: '05:30', 
        saving: '£1.84', carbon: '1.2 kg',
        color: '#00f5d4', badge: 'OPTIMAL'
      },
      { 
        id: 'washer', name: 'Washing Machine', icon: Waves, power_kw: 2.0, 
        status: 'running', start: '10:00', end: '11:30', 
        saving: '£0.12', carbon: '0.3 kg',
        color: '#39ff14', badge: 'RUNNING'
      },
      { 
        id: 'dishwasher', name: 'Dishwasher', icon: Sparkles, power_kw: 1.8, 
        status: 'waiting', start: '14:00', end: '16:00', 
        saving: '£0.22', carbon: '0.4 kg',
        color: '#ff9e00', badge: 'WAITING'
      }
    ]
  },
  {
    id: 'h002',
    name: 'Sarah Thompson',
    address: '7 Jericho Street, Oxford',
    avatar: '👩',
    tariff: 'Octopus Agile',
    monthly_bill: '£64',
    saving_pct: 42,
    appliances: [
      { 
        id: 'heat_pump', name: 'Heat Pump', icon: Flame, power_kw: 3.0, 
        status: 'scheduled', start: '03:00', end: '05:00', 
        saving: '£0.96', carbon: '0.9 kg',
        color: '#00f5d4', badge: 'SCHEDULED'
      },
      { 
        id: 'battery', name: 'Home Battery', icon: BatteryCharging, power_kw: 3.5, 
        status: 'running', start: '01:00', end: '07:00', 
        saving: '£1.12', carbon: '1.5 kg',
        color: '#39ff14', badge: 'CHARGING'
      }
    ]
  },
  {
    id: 'h003',
    name: 'The Chen Household',
    address: '23 Headington Ave, Oxford',
    avatar: '👨‍👩‍👦',
    tariff: 'Octopus Agile',
    monthly_bill: '£109',
    saving_pct: 31,
    appliances: [
      { 
        id: 'ev', name: 'EV Charger', icon: Car, power_kw: 11.0, 
        status: 'scheduled', start: '01:30', end: '04:30', 
        saving: '£2.41', carbon: '1.8 kg',
        color: '#00f5d4', badge: 'OPTIMAL'
      },
      { 
        id: 'dryer', name: 'Tumble Dryer', icon: Wind, power_kw: 2.5, 
        status: 'scheduled', start: '04:00', end: '05:00', 
        saving: '£0.31', carbon: '0.5 kg',
        color: '#ff9e00', badge: 'QUEUED'
      },
      { 
        id: 'dishwasher', name: 'Dishwasher', icon: Sparkles, power_kw: 1.8, 
        status: 'done', start: '22:00', end: '00:00', 
        saving: '£0.18', carbon: '0.4 kg',
        color: '#64748b', badge: 'DONE'
      }
    ]
  },
  {
    id: 'h004',
    name: 'Dr. Amara Osei',
    address: '5 Norham Gardens, Oxford',
    avatar: '👩‍🔬',
    tariff: 'Octopus Agile',
    monthly_bill: '£57',
    saving_pct: 44,
    appliances: [
      { 
        id: 'battery', name: 'Home Battery', icon: BatteryCharging, power_kw: 3.5, 
        status: 'running', start: '02:00', end: '08:00', 
        saving: '£1.28', carbon: '1.6 kg',
        color: '#39ff14', badge: 'CHARGING'
      },
      { 
        id: 'washer', name: 'Washing Machine', icon: Waves, power_kw: 2.0, 
        status: 'waiting', start: '07:00', end: '08:30', 
        saving: '£0.09', carbon: '0.2 kg',
        color: '#ff9e00', badge: 'WAITING'
      }
    ]
  }
];

function TimelineBar({ appliances }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const parseHour = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  };

  return (
    <div className="timeline-container">
      {/* Hour markers */}
      <div className="timeline-hours">
        {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
          <div key={h} className="timeline-hour-marker" style={{ left: `${(h / 24) * 100}%` }}>
            <span className="timeline-hour-label">{h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}</span>
          </div>
        ))}
      </div>

      {/* Track */}
      <div className="timeline-track">
        {/* Current time indicator */}
        <div className="timeline-now" style={{ left: `${(17.16 / 24) * 100}%` }}>
          <div className="timeline-now-line"></div>
          <span className="timeline-now-label">NOW</span>
        </div>

        {/* Appliance bars */}
        {appliances.map((app, i) => {
          const startH = parseHour(app.start);
          const endH = parseHour(app.end === '00:00' ? '24:00' : app.end);
          const left = (startH / 24) * 100;
          const width = ((endH - startH) / 24) * 100;
          return (
            <div
              key={app.id}
              className="timeline-app-row"
              style={{ '--row-i': i }}
            >
              <div className="timeline-app-label">
                <app.icon style={{ width: 12, height: 12, color: app.color }} />
                <span>{app.name}</span>
              </div>
              <div className="timeline-app-track">
                <div
                  className={`timeline-app-bar ${app.status}`}
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 2)}%`,
                    background: app.status === 'done' ? '#1e293b' : `${app.color}33`,
                    borderColor: app.color,
                    '--glow-color': app.color
                  }}
                >
                  <span className="timeline-app-bar-label">{app.start}–{app.end}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HouseholdCard({ household, isSelected, onClick }) {
  const totalSaving = household.appliances
    .reduce((sum, a) => sum + parseFloat(a.saving.replace('£', '')), 0)
    .toFixed(2);

  return (
    <button
      onClick={onClick}
      className={`household-card ${isSelected ? 'household-card-selected' : ''}`}
    >
      <div className="household-card-avatar">{household.avatar}</div>
      <div className="household-card-info">
        <div className="household-card-name">{household.name}</div>
        <div className="household-card-address">{household.address}</div>
        <div className="household-card-stats">
          <span className="household-stat-saving">-{household.saving_pct}%</span>
          <span className="household-card-bill">{household.monthly_bill}/mo</span>
        </div>
      </div>
      <ChevronRight className={`household-card-chevron ${isSelected ? 'selected' : ''}`} style={{ width: 16, height: 16 }} />
    </button>
  );
}

function ApplianceScheduleCard({ app }) {
  const statusConfig = {
    running: { label: 'Running Now', color: '#39ff14', icon: Zap },
    scheduled: { label: 'Scheduled', color: '#00f5d4', icon: Clock },
    waiting: { label: 'Waiting', color: '#ff9e00', icon: AlertCircle },
    done: { label: 'Complete', color: '#64748b', icon: CheckCircle2 }
  };
  const sc = statusConfig[app.status] || statusConfig.waiting;

  return (
    <div className={`appliance-schedule-card appliance-status-${app.status}`} style={{ '--app-color': app.color }}>
      <div className="appliance-card-header">
        <div className="appliance-card-icon-wrap" style={{ background: `${app.color}20`, borderColor: `${app.color}50` }}>
          <app.icon style={{ width: 22, height: 22, color: app.color }} />
        </div>
        <div className="appliance-card-title-block">
          <div className="appliance-card-name">{app.name}</div>
          <div className="appliance-card-power">{app.power_kw} kW</div>
        </div>
        <div className="appliance-card-status-pill" style={{ color: sc.color, borderColor: `${sc.color}40`, background: `${sc.color}12` }}>
          <sc.icon style={{ width: 10, height: 10 }} />
          <span>{sc.label}</span>
        </div>
      </div>

      <div className="appliance-card-time">
        <Clock style={{ width: 13, height: 13, color: '#64748b' }} />
        <span>{app.start} → {app.end}</span>
      </div>

      <div className="appliance-card-metrics">
        <div className="appliance-metric">
          <PoundSterling style={{ width: 11, height: 11, color: '#39ff14' }} />
          <span className="appliance-metric-value" style={{ color: '#39ff14' }}>{app.saving}</span>
          <span className="appliance-metric-label">saved</span>
        </div>
        <div className="appliance-metric">
          <Leaf style={{ width: 11, height: 11, color: '#00f5d4' }} />
          <span className="appliance-metric-value" style={{ color: '#00f5d4' }}>{app.carbon}</span>
          <span className="appliance-metric-label">CO₂ avoided</span>
        </div>
      </div>

      {app.status === 'running' && (
        <div className="appliance-running-bar">
          <div className="appliance-running-fill" style={{ background: app.color }}></div>
        </div>
      )}
    </div>
  );
}

export default function SingleHouseholdView() {
  const [selectedId, setSelectedId] = useState('h001');
  const household = HOUSEHOLD_PROFILES.find(h => h.id === selectedId);

  const totalSaving = household.appliances
    .reduce((sum, a) => sum + parseFloat(a.saving.replace('£', '')), 0)
    .toFixed(2);
  const totalCarbon = household.appliances
    .reduce((sum, a) => sum + parseFloat(a.carbon), 0)
    .toFixed(1);

  return (
    <div className="shv-root">
      {/* Header */}
      <div className="shv-header">
        <div>
          <div className="section-tag">MY HOME VIEW</div>
          <h2 className="shv-title">Single Household Dashboard</h2>
          <p className="shv-subtitle">
            Track your appliances, savings, and CO₂ avoidance in real-time. Click a household to explore.
          </p>
        </div>
        <div className="shv-live-badge">
          <span className="live-dot"></span>
          <span>Live • Re-planning every 14m</span>
        </div>
      </div>

      <div className="shv-layout">
        {/* Left: Household Selector */}
        <div className="shv-sidebar">
          <div className="shv-sidebar-title">
            <Home style={{ width: 14, height: 14, color: '#00f5d4' }} />
            <span>Select Household</span>
          </div>
          <div className="shv-household-list">
            {HOUSEHOLD_PROFILES.map(h => (
              <HouseholdCard
                key={h.id}
                household={h}
                isSelected={selectedId === h.id}
                onClick={() => setSelectedId(h.id)}
              />
            ))}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="shv-detail">
          {/* Household Hero Banner */}
          <div className="shv-hero-card">
            <div className="shv-hero-left">
              <div className="shv-hero-avatar">{household.avatar}</div>
              <div>
                <div className="shv-hero-name">{household.name}</div>
                <div className="shv-hero-address">{household.address}</div>
                <div className="shv-hero-tariff">
                  <Zap style={{ width: 12, height: 12, color: '#ff9e00' }} />
                  <span>{household.tariff}</span>
                </div>
              </div>
            </div>
            <div className="shv-hero-stats">
              <div className="shv-hero-stat">
                <span className="shv-hero-stat-label">Monthly Bill</span>
                <span className="shv-hero-stat-value">{household.monthly_bill}</span>
              </div>
              <div className="shv-hero-stat shv-hero-stat-highlight">
                <span className="shv-hero-stat-label">Bill Saving</span>
                <span className="shv-hero-stat-value shv-stat-green">-{household.saving_pct}%</span>
              </div>
              <div className="shv-hero-stat">
                <span className="shv-hero-stat-label">Today's £ Saved</span>
                <span className="shv-hero-stat-value shv-stat-cyan">£{totalSaving}</span>
              </div>
              <div className="shv-hero-stat">
                <span className="shv-hero-stat-label">CO₂ Avoided</span>
                <span className="shv-hero-stat-value shv-stat-teal">{totalCarbon} kg</span>
              </div>
            </div>
          </div>

          {/* 24hr Timeline */}
          <div className="shv-section-card">
            <div className="shv-section-header">
              <Clock style={{ width: 15, height: 15, color: '#00f5d4' }} />
              <span className="shv-section-title">24-Hour Schedule</span>
              <span className="shv-section-today">Today, {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            </div>
            <TimelineBar appliances={household.appliances} />
          </div>

          {/* Appliance Cards */}
          <div className="shv-section-title-row">
            <Zap style={{ width: 15, height: 15, color: '#ff9e00' }} />
            <span className="shv-section-label">Appliance Schedule</span>
            <span className="shv-appliance-count">{household.appliances.length} appliances</span>
          </div>
          <div className="shv-appliance-grid">
            {household.appliances.map(app => (
              <ApplianceScheduleCard key={app.id} app={app} />
            ))}
          </div>

          {/* Daily Summary Footer */}
          <div className="shv-summary-row">
            <div className="shv-summary-pill shv-summary-green">
              <TrendingDown style={{ width: 14, height: 14 }} />
              <span>£{totalSaving} saved today</span>
            </div>
            <div className="shv-summary-pill shv-summary-teal">
              <Leaf style={{ width: 14, height: 14 }} />
              <span>{totalCarbon} kg CO₂ avoided</span>
            </div>
            <div className="shv-summary-pill shv-summary-amber">
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              <span>{household.appliances.filter(a => a.status === 'done').length} tasks complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
