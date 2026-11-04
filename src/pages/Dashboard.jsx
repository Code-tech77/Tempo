import Reveal from '../components/Reveal.jsx';
import { formatMoney } from '../scheduling/money.js';
import { EXAMPLES } from '../scheduling/scheduleApi.js';

export default function Dashboard({ household, livePrice, liveCarbon, plannerDraft, setPlannerDraft, onOpenPlanner }) {
  const recommendations = household.appliances.filter(item => item.status !== 'done');
  const top = recommendations[0] || household.appliances[0];
  const carbonWord = liveCarbon < 100 ? 'Low' : liveCarbon < 200 ? 'Medium' : 'High';

  return (
    <div className="dashboard-page">
      <Reveal>
        <section className="recommendation-hero" aria-labelledby="today-heading">
          <div className="hero-copy">
            <p className="eyebrow">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 id="today-heading">Run the {top.name.toLowerCase()} between <span>{top.start} and {top.end}</span> and save an estimated <mark>{formatMoney(top.saving)}</mark>.</h1>
            <p className="hero-context">Based on {top.kw} kW appliance power and the current household schedule.</p>
          </div>
          <dl className="hero-summary">
            <div><dt>Estimated saving</dt><dd>{formatMoney(top.saving)}</dd></div>
            <div><dt>Price now</dt><dd>{livePrice.toFixed(1)}p per kWh</dd></div>
            <div><dt>Grid carbon now</dt><dd>{carbonWord} · {liveCarbon} grams per kWh</dd></div>
          </dl>
          <div className="hero-recommendations" aria-label="Other recommendations">
            {recommendations.slice(1).map(item => <div key={item.id}><span>{item.name}</span><span>{item.start}–{item.end}</span><strong>estimated {formatMoney(item.saving)} saving</strong></div>)}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="ask-tempo" aria-labelledby="ask-tempo-heading">
          <p className="eyebrow">Plan around your day</p>
          <h2 id="ask-tempo-heading">Ask Tempo</h2>
          <p>Describe what needs power and when it needs to be ready.</p>
          <div className="ask-row">
            <input
              value={plannerDraft}
              onChange={event => setPlannerDraft(event.target.value)}
              onFocus={() => onOpenPlanner(plannerDraft)}
              onClick={() => onOpenPlanner(plannerDraft)}
              placeholder="e.g. I get home at 6pm and leave at 7:30"
              aria-label="Ask Tempo about your schedule"
            />
            <button onClick={() => onOpenPlanner(plannerDraft)}>Update plan</button>
          </div>
          <div className="example-links" aria-label="Example requests">
            {EXAMPLES.map(example => <button key={example.label} onClick={() => onOpenPlanner(example.text)}>{example.text}</button>)}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
