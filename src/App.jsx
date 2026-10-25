import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Advisor from './pages/Advisor';
import Settings from './pages/Settings';
import SchedulePlanner from './pages/SchedulePlanner';

export const HOUSEHOLDS = [
  {
    id: 'h1', avatar: 'PF', name: 'The Patel Family', address: '14 Cowley Road', tariff: 'Octopus Agile', monthly_bill: 82, saving_pct: 38,
    appliances: [
      { id: 'ev', name: 'EV Charger', icon: 'EV', kw: 7.0, status: 'scheduled', start: '02:30', end: '05:30', saving: 1.84, carbon: 1.2 },
      { id: 'washer', name: 'Washing Machine', icon: 'WM', kw: 2.0, status: 'running', start: '10:00', end: '11:30', saving: 0.12, carbon: 0.3 },
      { id: 'dishwasher', name: 'Dishwasher', icon: 'DW', kw: 1.8, status: 'waiting', start: '14:00', end: '16:00', saving: 0.22, carbon: 0.4 },
    ],
  },
  {
    id: 'h2', avatar: 'ST', name: 'Sarah Thompson', address: '7 Jericho Street', tariff: 'Octopus Agile', monthly_bill: 64, saving_pct: 42,
    appliances: [
      { id: 'heat_pump', name: 'Heat Pump', icon: 'HP', kw: 3.0, status: 'scheduled', start: '03:00', end: '05:00', saving: 0.96, carbon: 0.9 },
      { id: 'battery', name: 'Home Battery', icon: 'HB', kw: 3.5, status: 'running', start: '01:00', end: '07:00', saving: 1.12, carbon: 1.5 },
    ],
  },
  {
    id: 'h3', avatar: 'CH', name: 'The Chen Household', address: '23 Headington Ave', tariff: 'Octopus Agile', monthly_bill: 109, saving_pct: 31,
    appliances: [
      { id: 'ev', name: 'EV Charger', icon: 'EV', kw: 11.0, status: 'scheduled', start: '01:30', end: '04:30', saving: 2.41, carbon: 1.8 },
      { id: 'dryer', name: 'Tumble Dryer', icon: 'TD', kw: 2.5, status: 'scheduled', start: '04:00', end: '05:00', saving: 0.31, carbon: 0.5 },
      { id: 'dishwasher', name: 'Dishwasher', icon: 'DW', kw: 1.8, status: 'done', start: '22:00', end: '00:00', saving: 0.18, carbon: 0.4 },
    ],
  },
  {
    id: 'h4', avatar: 'AO', name: 'Dr. Amara Osei', address: '5 Norham Gardens', tariff: 'Octopus Agile', monthly_bill: 57, saving_pct: 44,
    appliances: [
      { id: 'battery', name: 'Home Battery', icon: 'HB', kw: 3.5, status: 'running', start: '02:00', end: '08:00', saving: 1.28, carbon: 1.6 },
      { id: 'washer', name: 'Washing Machine', icon: 'WM', kw: 2.0, status: 'waiting', start: '07:00', end: '08:30', saving: 0.09, carbon: 0.2 },
    ],
  },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'advisor', label: 'Smart Advisor' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [householdId, setHouseholdId] = useState('h1');
  const [livePrice, setLivePrice] = useState(16.4);
  const [liveCarbon, setLiveCarbon] = useState(128);
  const [plannerDraft, setPlannerDraft] = useState('');
  const household = HOUSEHOLDS.find(item => item.id === householdId);

  useEffect(() => {
    fetch('/api/status')
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data) return;
        setLivePrice(data.current_price_pence_kwh ?? 16.4);
        setLiveCarbon(data.current_carbon_gco2_kwh ?? 128);
      })
      .catch(() => {});
  }, []);

  const openPlanner = (prompt = plannerDraft) => {
    setPlannerDraft(prompt);
    setPage('plan');
  };

  const shared = { household, householdId, setHouseholdId };
  const renderPage = () => {
    if (page === 'dashboard') return <Dashboard {...shared} livePrice={livePrice} liveCarbon={liveCarbon} plannerDraft={plannerDraft} setPlannerDraft={setPlannerDraft} onOpenPlanner={openPlanner} />;
    if (page === 'schedule') return <Schedule {...shared} />;
    if (page === 'advisor') return <Advisor {...shared} livePrice={livePrice} liveCarbon={liveCarbon} />;
    if (page === 'settings') return <Settings {...shared} />;
    if (page === 'plan') return <SchedulePlanner initialPrompt={plannerDraft} onPromptChange={setPlannerDraft} onBack={() => setPage('dashboard')} />;
    return null;
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="wordmark" onClick={() => setPage('dashboard')} aria-label="Tempo dashboard">Tempo</button>
        <nav className="nav-segments" aria-label="Main navigation">
          {NAV_ITEMS.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>{item.label}</button>)}
        </nav>
        <label className="household-select">
          <span className="sr-only">Demo household</span>
          <select value={householdId} onChange={event => setHouseholdId(event.target.value)} aria-label="Demo household">
            {HOUSEHOLDS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </header>
      <main className={`page page-${page}`}>{renderPage()}</main>
    </div>
  );
}
