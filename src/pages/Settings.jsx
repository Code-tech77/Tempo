import { HOUSEHOLDS } from '../App';
import Reveal from '../components/Reveal.jsx';
import { formatMoney } from '../scheduling/money.js';

export default function Settings({ household, householdId, setHouseholdId }) {
  return (
    <div className="settings-page">
      <Reveal className="page-header">
        <p className="eyebrow">Preferences</p>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Choose the demo household and review the information Tempo uses.</p>
      </Reveal>

      <Reveal className="settings-section hairline-section">
        <div className="section-heading"><div><p className="eyebrow">Demo household</p><h2>Switch household</h2></div><p>These profiles contain example data.</p></div>
        <div className="household-list">
          {HOUSEHOLDS.map(item => (
            <button key={item.id} className={householdId === item.id ? 'active' : ''} onClick={() => setHouseholdId(item.id)} aria-pressed={householdId === item.id}>
              <span className="household-initials">{item.avatar}</span>
              <span><strong>{item.name}</strong><small>{item.address} · {item.tariff}</small></span>
              <span>{householdId === item.id ? 'Selected' : `${formatMoney(item.monthly_bill)} / month`}</span>
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal className="settings-section hairline-section">
        <div className="section-heading"><div><p className="eyebrow">Energy account</p><h2>Tariff and bill</h2></div></div>
        <dl className="settings-rows">
          <div><dt>Tariff</dt><dd>{household.tariff}</dd><small>Prices can change every half hour</small></div>
          <div><dt>Average monthly bill</dt><dd>{formatMoney(household.monthly_bill)}</dd><small>Demo household estimate</small></div>
          <div><dt>Estimated reduction</dt><dd>{household.saving_pct}%</dd><small>Compared with the demo’s usual timings</small></div>
        </dl>
      </Reveal>

      <Reveal className="settings-section hairline-section">
        <div className="section-heading"><div><p className="eyebrow">Connected appliances</p><h2>What Tempo can schedule</h2></div></div>
        <div className="settings-appliances">{household.appliances.map(appliance => <div key={appliance.id}><span className="appliance-initials">{appliance.icon}</span><span><strong>{appliance.name}</strong><small>{appliance.kw} kW power rating</small></span><span>Connected</span></div>)}</div>
      </Reveal>

      <Reveal className="settings-section hairline-section about-tempo">
        <div><p className="eyebrow">About Tempo</p><h2>Advice that accounts for uncertainty</h2><p>Tempo compares possible future prices instead of treating one forecast as certain. It shows the likely saving alongside the chance that waiting could cost more.</p></div>
        <a href="https://github.com/Code-tech77/Tempo" target="_blank" rel="noopener noreferrer">View project on GitHub</a>
      </Reveal>
    </div>
  );
}
