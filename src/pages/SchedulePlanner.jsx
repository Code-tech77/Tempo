import { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Clock3, Leaf, LoaderCircle, RotateCcw, Shield, Sparkles, Zap } from 'lucide-react';
import { buildScheduleRequest, createScheduleTransport, EXAMPLES, formatScheduleRange, formatSlot, formatSlotTime, formatSlotZone, getResponseMessage } from '../scheduling/scheduleApi.js';
import { formatMoney, getBaselineCost } from '../scheduling/money.js';
import './SchedulePlanner.css';

const transport = createScheduleTransport();
const LABELS = {
  ev_charger: 'EV charger', dishwasher: 'Dishwasher', washing_machine: 'Washing machine',
};
const SCENARIOS = [
  ['earliest_interpretation', 'Earlier deadline', 'Less time to move the run'],
  ['expected_interpretation', 'Most likely deadline', 'What Tempo understood first'],
  ['latest_interpretation', 'Later deadline', 'More time to find a lower price'],
];
function ScenarioCard({ scenario, recommended }) {
  const baselineCost = getBaselineCost(scenario);
  const slotDays = new Set(scenario.recommended_slots_utc.map(slot => formatSlot(slot).split(',')[0]));
  const slotZones = new Set(scenario.recommended_slots_utc.map(formatSlotZone));
  const compactSlots = slotDays.size === 1 && slotZones.size === 1;
  return (
    <article className={`planner-scenario ${recommended ? 'is-recommended' : ''}`}>
      <div className="planner-scenario-head">
        <div><h3>{scenario.label}</h3><p>Finish by <time dateTime={scenario.deadline_utc} title={`UTC source: ${scenario.deadline_utc}`}>{formatSlot(scenario.deadline_utc)}</time></p></div>
        {recommended && <span className="planner-recommended"><Check size={13} /> Recommended</span>}
      </div>
      <div className="planner-scenario-price">
        <strong>{formatMoney(scenario.estimated_cost_gbp, { negativeAsCredit: true })}</strong>
        <span>scheduled cost</span>
      </div>
      <div className="planner-cost-comparison">
        <p><span>Running-now baseline</span><strong>{formatMoney(baselineCost, { negativeAsCredit: true })}</strong></p>
        <p><span>Savings versus running now</span><strong>{formatMoney(scenario.savings_vs_now_gbp)}</strong></p>
      </div>
      <dl className="planner-metrics">
        <div><dt>Chance waiting costs less</dt><dd>{scenario.wait_probability_pct}%</dd></div>
        <div><dt>Worst case loss</dt><dd>{formatMoney(scenario.worst_case_loss_pence / 100)}</dd></div>
        <div><dt>Carbon impact</dt><dd>{Math.round(scenario.carbon_g_co2).toLocaleString()} g CO₂</dd></div>
        <div><dt>Deadline</dt><dd><time dateTime={scenario.deadline_utc} title={`UTC source: ${scenario.deadline_utc}`}>{formatSlot(scenario.deadline_utc)}</time></dd></div>
      </dl>
      <div className="planner-slots">
        <h4>Recommended half-hours <span>{compactSlots ? `${formatSlot(scenario.recommended_slots_utc[0]).split(',')[0]} · ${formatSlotZone(scenario.recommended_slots_utc[0])}` : 'UK time'}</span></h4>
        <ul>{scenario.recommended_slots_utc.map(slot => <li key={slot}><Clock3 size={14} /><time dateTime={slot} title={`UTC source: ${slot}`}>{compactSlots ? formatSlotTime(slot) : formatSlot(slot)}</time></li>)}</ul>
      </div>
    </article>
  );
}

export function Results({ response }) {
  const parsed = response.parsed_constraints;
  const recommended = response.scenarios.expected_interpretation;
  const recommendedBaseline = getBaselineCost(recommended);
  return (
    <section className="planner-results" aria-labelledby="planner-results-title">
      {response.validation_warning && <div className="planner-notice warning" role="status"><AlertCircle size={18} /><p>{response.validation_warning}</p></div>}
      <div className="planner-result-hero">
        <div className="planner-result-icon"><Zap size={20} /></div>
        <div><p className="planner-eyebrow">Recommended schedule · expected timing</p><h2 id="planner-results-title" title={`UTC slots: ${recommended.recommended_slots_utc.join(', ')}`}>{formatScheduleRange(recommended.recommended_slots_utc)}</h2></div>
        <dl className="planner-result-cost">
          <div><dt>Scheduled cost</dt><dd>{formatMoney(recommended.estimated_cost_gbp, { negativeAsCredit: true })}</dd></div>
          <div><dt>Running-now baseline</dt><dd>{formatMoney(recommendedBaseline, { negativeAsCredit: true })}</dd></div>
          <div><dt>Savings versus running now</dt><dd>{formatMoney(recommended.savings_vs_now_gbp)}</dd></div>
        </dl>
      </div>
      <div className="planner-readback">
        <div className="planner-readback-title"><Sparkles size={17} /><h3>Schedule summary</h3></div>
        <p>{parsed.read_back_summary}</p>
        <div className="planner-readback-facts"><span>{LABELS[parsed.appliance] || parsed.appliance}</span><span>{parsed.energy_kwh} kWh</span><span>{parsed.is_contiguous ? 'One continuous cycle' : 'Can use separate slots'}</span></div>
        <details><summary>Check what we understood</summary><ul><li><b>Earliest:</b> “{parsed.evidence.earliest}”</li><li><b>Expected:</b> “{parsed.evidence.expected}”</li><li><b>Latest:</b> “{parsed.evidence.latest}”</li></ul></details>
      </div>
      <div className="planner-flexibility"><div className="planner-flex-icon"><Leaf size={19} /></div><div><strong>{formatMoney(response.flexibility_spread_pence / 100)} flexibility spread</strong><p>The scheduled-cost difference between the earliest and latest possible deadlines.</p></div></div>
      <div className="planner-scenario-heading"><div><p className="planner-eyebrow">Compare deadlines</p><h2>Three ways your timing could be understood</h2></div><p>These are alternative deadlines, not forecast ranges.</p></div>
      <div className="planner-scenario-grid">{SCENARIOS.map(([key, title, subtitle], index) => <ScenarioCard key={key} scenario={{ ...response.scenarios[key], label: `${title} · ${subtitle}` }} recommended={index === 1} />)}</div>
    </section>
  );
}

export function ResponseOutcome({ response }) {
  return <section className={`planner-outcome ${response.status === 'impossible_constraint' ? 'impossible' : ''}`} role="status"><div className="planner-outcome-icon"><AlertCircle size={20} /></div><div><p className="planner-eyebrow">{response.status === 'impossible_constraint' ? 'Schedule cannot be met' : 'One more detail needed'}</p><h2>{response.clarification_message}</h2>{response.validation_warning && <p className="planner-warning-text">{response.validation_warning}</p>}<p className="planner-preserved">Your original description is still here. Edit it above and try again.</p></div></section>;
}

export function TransportDisclosure({ mode }) {
  if (mode !== 'mock') return null;
  return <div className="planner-mock-disclosure" role="status"><AlertCircle size={16} /><span><strong>Mock preview</strong> · Cached demo response. No live scheduling result is being shown.</span></div>;
}

export default function SchedulePlanner({ initialPrompt = '', onPromptChange = () => {}, onBack = () => {} }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [carbonWeight, setCarbonWeight] = useState(0.3);
  const [riskAppetite, setRiskAppetite] = useState('balanced');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const currentTime = useMemo(() => new Date().toISOString(), []);
  const updatePrompt = value => { setPrompt(value); onPromptChange(value); };
  const applyExample = example => { updatePrompt(example.text); setResult(null); setError(''); };

  async function submit(event) {
    event.preventDefault();
    setError(''); setResult(null);
    let request;
    try { request = buildScheduleRequest({ userPrompt: prompt, carbonWeight, riskAppetite }); }
    catch (validationError) { setError(validationError.message); return; }
    setLoading(true);
    try {
      const response = await transport.submit(request);
      if (!response?.needs_clarification) getResponseMessage(response);
      setResult(response);
    } catch (requestError) { setError(requestError.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="planner-page">
      <button className="planner-back" type="button" onClick={onBack}><ArrowLeft size={15} /> Back to dashboard</button>
      <header className="planner-header"><p className="planner-kicker">Home energy planner</p><h1>Make time work<br /><em>for your energy.</em></h1><p>Tell Tempo what needs power and when it needs to be ready. Compare the cost of different timings around your plans.</p></header>
      <TransportDisclosure mode={transport.mode} />
      <div className="planner-layout">
        <form className="planner-form" onSubmit={submit}>
          <div className="planner-form-top"><div><span className="planner-step">01</span><h2>Your schedule</h2></div><span className="planner-private"><Shield size={14} /> Your plans guide the timing</span></div>
          <label className="planner-label" htmlFor="schedule-prompt">What do you need to run, and by when?</label>
          <textarea id="schedule-prompt" rows="5" maxLength="4000" required minLength="3" value={prompt} onChange={event => updatePrompt(event.target.value)} placeholder="For example: Charge my EV with 14 kWh before I leave tomorrow at 7:30am. It can charge in separate slots." aria-describedby="prompt-hint prompt-count" />
          <div className="planner-input-meta"><span id="prompt-hint">Include energy or duration and a deadline.</span><span id="prompt-count">{prompt.length}/4000</span></div>
          <div className="planner-examples"><p>Try an example</p><div>{EXAMPLES.map(example => <button type="button" key={example.label} onClick={() => applyExample(example)}>{example.label}<ArrowRight size={13} /></button>)}</div></div>
          <div className="planner-settings">
            <div className="planner-setting-row"><div><label htmlFor="carbon-weight">Price and carbon balance</label><p>Choose how strongly lower-carbon times should influence the result</p></div><span className="planner-control-value">{Math.round(carbonWeight * 100)}%</span></div>
            <input id="carbon-weight" type="range" min="0" max="1" step="0.05" value={carbonWeight} onChange={event => setCarbonWeight(Number(event.target.value))} aria-label="Price and carbon balance" />
            <div className="planner-range-labels"><span>Lowest cost</span><span>Lower carbon</span></div>
            <div className="planner-setting-row risk-row"><div><label htmlFor="risk-appetite">How much certainty do you want?</label><p>Choose how cautious Tempo should be about changing prices</p></div>
              <select id="risk-appetite" value={riskAppetite} onChange={event => setRiskAppetite(event.target.value)}><option value="safe">Play it safe</option><option value="balanced">Balanced</option><option value="aggressive">Chase bigger savings</option></select></div>
          </div>
          <div className="planner-current-time"><Clock3 size={15} /><span>Current time supplied automatically</span><time dateTime={currentTime}>{new Intl.DateTimeFormat('en-GB', { dateStyle:'medium', timeStyle:'short', timeZone:'Europe/London' }).format(new Date(currentTime))} UK time</time></div>
          {error && <div className="planner-notice error" role="alert"><AlertCircle size={18} /><p>{error}</p></div>}
          <button className="planner-submit" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="planner-spin" size={18} /> Interpreting your schedule and finding suitable energy slots…</> : <>Find a suitable time <ArrowRight size={17} /></>}</button>
          {error && <button className="planner-retry" type="button" onClick={() => document.querySelector('.planner-form')?.requestSubmit()}><RotateCcw size={14} /> Try again</button>}
        </form>
        <aside className="planner-aside"><p className="planner-aside-label">What you will see</p><h2>Real plans.<br />Flexible energy.</h2><p>Tempo fits appliance use around the times that matter to you, then compares cost, possible savings and changing-price uncertainty.</p><div className="planner-aside-list"><span><Check size={14} /> Clear costs and savings</span><span><Check size={14} /> Your deadlines stay in view</span><span><Check size={14} /> Uncertainty shown plainly</span></div></aside>
      </div>
      {result?.status === 'success' && !result.needs_clarification && <Results response={result} />}
      {result?.needs_clarification && <ResponseOutcome response={result} />}
    </div>
  );
}
