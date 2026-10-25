import { useEffect, useState } from 'react';
import ForecastRadar from '../components/ForecastRadar.jsx';
import GridStaggerSimulator from '../components/GridStaggerSimulator.jsx';
import HistoricalBacktest from '../components/HistoricalBacktest.jsx';
import Reveal from '../components/Reveal.jsx';
import { createAdvisorScheduleEntry } from '../scheduling/advisorSchedule.js';
import { formatMoney } from '../scheduling/money.js';

const PRESETS = [
  { id:'ev', name:'EV Charger', kw:7, hrs:3.5 },
  { id:'heat_pump', name:'Heat Pump', kw:3, hrs:2 },
  { id:'battery', name:'Home Battery', kw:3.5, hrs:3 },
  { id:'washer', name:'Washing Machine', kw:2, hrs:1.5 },
  { id:'dryer', name:'Tumble Dryer', kw:2.5, hrs:1 },
  { id:'dishwasher', name:'Dishwasher', kw:1.8, hrs:2 },
];

export default function Advisor({ household, livePrice, liveCarbon, onAddToSchedule = () => {} }) {
  const [preset, setPreset] = useState('ev');
  const [kw, setKw] = useState(7);
  const [hrs, setHrs] = useState(3.5);
  const [result, setResult] = useState(null);
  const [resultSource, setResultSource] = useState('live');
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const selected = PRESETS.find(item => item.id === preset);

  const fetchAdvice = async () => {
    setLoading(true);
    setScheduled(false);
    try {
      const response = await fetch('/api/recommend', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ appliance:selected?.name || 'Custom', power_kw:kw, duration_hours:hrs, deadline_slots:18, priority:'balanced' }),
      });
      if (response.ok) {
        setResult(await response.json());
        setResultSource('live');
        setLoading(false);
        return;
      }
    } catch {}

    const saving = (livePrice * .46 * kw * hrs) / 100;
    const costNow = (livePrice * kw * hrs) / 100;
    setResult({
      decision:'WAIT', headline:'Wait until 02:30',
      subheadline:'Waiting is likely to cost less, with a small chance of paying 6p more.',
      confidence_pct:84.2, downside_risk_pence:5.8,
      expected_saving_pounds:formatMoney(saving), savings_discount_pct:46,
      carbon_saved_kg:(kw * hrs * .128).toFixed(1),
      cost_now_pounds:formatMoney(costNow), cost_scheduled_pounds:formatMoney(costNow - saving),
      optimal_start_time:new Date(Date.now() + 9 * 3600000).toISOString(),
    });
    setResultSource('cached');
    setLoading(false);
  };

  useEffect(() => { fetchAdvice(); }, [preset, kw, hrs]);

  const savedToday = household.appliances.reduce((sum, item) => sum + item.saving, 0);
  const carbonSaved = household.appliances.reduce((sum, item) => sum + item.carbon, 0);
  const carbonWord = liveCarbon < 100 ? 'Low' : liveCarbon < 200 ? 'Medium' : 'High';
  const addToSchedule = () => {
    const entry = createAdvisorScheduleEntry({ preset:selected, powerKw:kw, durationHours:hrs, result });
    onAddToSchedule(entry);
    setScheduled(true);
  };

  return (
    <div className="advisor-page">
      <header className="page-header">
        <p className="eyebrow">Prices, timing and evidence</p>
        <div className="page-title">Smart Advisor</div>
        <div className="page-sub">See what Tempo is using to recommend a time, and how much the choice could change your bill.</div>
      </header>

      <Reveal>
        <section className="metric-grid" aria-label="Household energy summary">
          <div className="metric"><span className="metric-label">Estimated saving today</span><strong className="metric-value">{formatMoney(savedToday)}</strong><span className="metric-note">Across planned appliances</span></div>
          <div className="metric"><span className="metric-label">Estimated bill reduction</span><strong className="metric-value">{household.saving_pct}%</strong><span className="metric-note">Demo household estimate</span></div>
          <div className="metric"><span className="metric-label">Price now</span><strong className="metric-value">{livePrice.toFixed(1)}p</strong><span className="metric-note">per kilowatt-hour</span></div>
          <div className="metric"><span className="metric-label">Grid carbon now</span><strong className="metric-value">{carbonWord}</strong><span className="metric-note">{liveCarbon} grams per kilowatt-hour</span></div>
        </section>
      </Reveal>

      <Reveal>
        <section className="advisor-decision hairline-section">
          <div className="section-heading"><div><p className="eyebrow">Run now or wait?</p><h2>Check an appliance</h2></div>{resultSource === 'cached' && <span className="source-note">Cached demo estimate · live advice unavailable</span>}</div>
          <div className="segmented appliance-picker" aria-label="Choose an appliance">
            {PRESETS.map(item => <button key={item.id} className={preset === item.id ? 'active' : ''} onClick={() => { setPreset(item.id); setKw(item.kw); setHrs(item.hrs); }}>{item.name}</button>)}
          </div>
          <div className="advisor-controls">
            <label><span>Appliance power <b>{kw} kW</b></span><input type="range" min=".5" max="11" step=".5" value={kw} onChange={event => setKw(Number(event.target.value))} /></label>
            <label><span>Run time <b>{hrs} hours · {(kw * hrs).toFixed(1)} kWh</b></span><input type="range" min=".5" max="8" step=".5" value={hrs} onChange={event => setHrs(Number(event.target.value))} /></label>
          </div>
          {loading ? <div className="loading-row">Checking the latest prices…</div> : result && (
            <div className="decision-editorial">
              <div>
                <p className="eyebrow">{result.decision === 'WAIT' ? 'Better to wait' : 'A good time to run'}</p>
                <h3>{result.headline}</h3>
                <p>{result.subheadline}</p>
              </div>
              <dl>
                <div><dt>Estimated saving</dt><dd>{result.expected_saving_pounds}</dd></div>
                <div><dt>Chance waiting costs less</dt><dd>{result.confidence_pct}%</dd></div>
                <div><dt>If waiting costs more</dt><dd>up to {result.downside_risk_pence}p</dd></div>
                <div><dt>Estimated carbon avoided</dt><dd>{result.carbon_saved_kg} kg</dd></div>
                <div><dt>Run now</dt><dd>{result.cost_now_pounds}</dd></div>
                <div><dt>Recommended time</dt><dd>{result.cost_scheduled_pounds}</dd></div>
              </dl>
              <button className="primary-button" onClick={addToSchedule} disabled={scheduled}>{scheduled ? 'Added to schedule' : 'Add to schedule'}</button>
            </div>
          )}
        </section>
      </Reveal>

      <Reveal><ForecastRadar household={household} /></Reveal>
      <Reveal><details className="analysis-disclosure"><summary>How Tempo coordinates many homes</summary><GridStaggerSimulator /></details></Reveal>
      <Reveal><details className="analysis-disclosure"><summary>How estimated savings are checked</summary><HistoricalBacktest /></details></Reveal>
      <p className="method-note">Estimated carbon avoided today: {carbonSaved.toFixed(1)} kg. Demo household figures are illustrative; live price and forecast sections identify their sources separately.</p>
    </div>
  );
}
