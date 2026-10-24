import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Advisor from './pages/Advisor';
import Settings from './pages/Settings';
import Footer from './components/Footer';
// ── Shared household data ───────────────────────────────────────────
export const HOUSEHOLDS = [
  {
    id: 'h1', avatar: '👨‍👩‍👧‍👦', name: 'The Patel Family',
    address: '14 Cowley Road', tariff: 'Octopus Agile',
    monthly_bill: 82, saving_pct: 38,
    appliances: [
      { id: 'ev',         name: 'EV Charger',       icon: '🚗', kw: 7.0,  status: 'scheduled', start: '02:30', end: '05:30', saving: 1.84, carbon: 1.2 },
      { id: 'washer',     name: 'Washing Machine',  icon: '🌊', kw: 2.0,  status: 'running',   start: '10:00', end: '11:30', saving: 0.12, carbon: 0.3 },
      { id: 'dishwasher', name: 'Dishwasher',       icon: '✨', kw: 1.8,  status: 'waiting',   start: '14:00', end: '16:00', saving: 0.22, carbon: 0.4 },
    ]
  },
  {
    id: 'h2', avatar: '👩', name: 'Sarah Thompson',
    address: '7 Jericho Street', tariff: 'Octopus Agile',
    monthly_bill: 64, saving_pct: 42,
    appliances: [
      { id: 'heat_pump', name: 'Heat Pump',    icon: '🔥', kw: 3.0, status: 'scheduled', start: '03:00', end: '05:00', saving: 0.96, carbon: 0.9 },
      { id: 'battery',   name: 'Home Battery', icon: '🔋', kw: 3.5, status: 'running',   start: '01:00', end: '07:00', saving: 1.12, carbon: 1.5 },
    ]
  },
  {
    id: 'h3', avatar: '👨‍👩‍👦', name: 'The Chen Household',
    address: '23 Headington Ave', tariff: 'Octopus Agile',
    monthly_bill: 109, saving_pct: 31,
    appliances: [
      { id: 'ev',         name: 'EV Charger',    icon: '🚗', kw: 11.0, status: 'scheduled', start: '01:30', end: '04:30', saving: 2.41, carbon: 1.8 },
      { id: 'dryer',      name: 'Tumble Dryer',  icon: '💨', kw: 2.5,  status: 'scheduled', start: '04:00', end: '05:00', saving: 0.31, carbon: 0.5 },
      { id: 'dishwasher', name: 'Dishwasher',    icon: '✨', kw: 1.8,  status: 'done',      start: '22:00', end: '00:00', saving: 0.18, carbon: 0.4 },
    ]
  },
  {
    id: 'h4', avatar: '👩‍🔬', name: 'Dr. Amara Osei',
    address: '5 Norham Gardens', tariff: 'Octopus Agile',
    monthly_bill: 57, saving_pct: 44,
    appliances: [
      { id: 'battery', name: 'Home Battery',     icon: '🔋', kw: 3.5, status: 'running', start: '02:00', end: '08:00', saving: 1.28, carbon: 1.6 },
      { id: 'washer',  name: 'Washing Machine',  icon: '🌊', kw: 2.0, status: 'waiting', start: '07:00', end: '08:30', saving: 0.09, carbon: 0.2 },
    ]
  },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
  { id: 'schedule',  label: 'Schedule',  icon: '📅' },
  { id: 'advisor',   label: 'Advisor',   icon: '🎯' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️'  },
];

export default function App() {
  const [page, setPage]             = useState('dashboard');
  const [householdId, setHouseholdId] = useState('h1');
  const [livePrice, setLivePrice]   = useState(16.4);
  const [liveCarbon, setLiveCarbon] = useState(128);

  const household = HOUSEHOLDS.find(h => h.id === householdId);

  // Simulate live price ticking
  useEffect(() => {
    const id = setInterval(() => {
      setLivePrice(prev => parseFloat((prev + (Math.random() - 0.5) * 0.4).toFixed(1)));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // Fetch real grid status if backend available
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setLivePrice(d.current_price_pence_kwh ?? 16.4);
          setLiveCarbon(d.current_carbon_gco2_kwh ?? 128);
        }
      })
      .catch(() => {});
  }, []);

  const renderPage = () => {
    const props = { household, householdId, setHouseholdId };
    switch (page) {
      case 'dashboard': return <Dashboard {...props} livePrice={livePrice} liveCarbon={liveCarbon} />;
      case 'schedule':  return <Schedule  {...props} />;
      case 'advisor':   return <Advisor   {...props} livePrice={livePrice} />;
      case 'settings':  return <Settings  {...props} />;
      default:          return <Dashboard {...props} livePrice={livePrice} liveCarbon={liveCarbon} />;
    }
  };

  return (
    <div className="app">
      {/* ── Top Nav ── */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo">⚡</div>
          <span className="nav-name">Tempo<span>.</span></span>
        </div>

        {/* Desktop tabs */}
        <div className="nav-tabs">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`nav-tab ${page === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <div className="nav-price-pill">
            <span className="dot"></span>
            {livePrice.toFixed(1)}p/kWh
          </div>
          <button
            className="nav-household"
            onClick={() => setPage('settings')}
            title="Switch household"
          >
            <span className="nav-household-avatar">{household.avatar}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{household.name.split(' ')[1] || household.name}</span>
          </button>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <main key={page} className="page">
        {renderPage()}
      </main>

      <Footer />


      {/* ── Mobile bottom nav ── */}
      <div className="mobile-tabs">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`mobile-tab ${page === item.id ? 'active' : ''}`}
          >
            <span className="mobile-tab-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
