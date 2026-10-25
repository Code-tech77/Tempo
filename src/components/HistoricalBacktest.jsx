import { useEffect, useState } from 'react';
import PlotlyChart from './PlotlyChart';
import { formatMoney } from '../scheduling/money.js';

const money = value => value == null ? '—' : formatMoney(Number(value), { negativeAsCredit:true });
const percent = value => value == null ? '—' : `${value}%`;

export default function HistoricalBacktest() {
  const [days, setDays] = useState(30);
  const [appliance, setAppliance] = useState('EV Charging');
  const [backtestData, setBacktestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/backtest?days=${days}&appliance=${encodeURIComponent(appliance)}`)
      .then(response => {
        if (!response.ok) throw new Error('Comparison unavailable');
        return response.json();
      })
      .then(data => { if (active) setBacktestData(data); })
      .catch(() => { if (active) setError('The past-results comparison is unavailable right now.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appliance, days]);

  const timeline = backtestData?.timeline;
  const chartData = timeline ? [
    { x:timeline.dates, y:timeline.cumulative_naive, name:'Run at the usual peak time', type:'scatter', mode:'lines', line:{ color:'#e4694c', width:2, dash:'dot' }, hovertemplate:'%{x}<br>Usual timing: £%{y:.2f}<extra></extra>' },
    { x:timeline.dates, y:timeline.cumulative_tempo, name:'Follow Tempo timing', type:'scatter', mode:'lines', line:{ color:'#2338d4', width:3 }, hovertemplate:'%{x}<br>Tempo timing: £%{y:.2f}<extra></extra>' },
    { x:timeline.dates, y:timeline.cumulative_savings, name:'Accumulated saving', type:'bar', opacity:.18, marker:{ color:'#2338d4' }, hovertemplate:'%{x}<br>Saved: £%{y:.2f}<extra></extra>' },
  ] : [];
  const layout = {
    showlegend:true,
    xaxis:{ title:'Date', gridcolor:'#f1f3fc', tickfont:{ size:10 } },
    yaxis:{ title:'Accumulated cost (£)', gridcolor:'#dfe2ee', zerolinecolor:'#11162b' },
    legend:{ orientation:'h', x:0, y:1.13, font:{ size:10 } },
    margin:{ t:58, r:18, b:58, l:62 },
  };

  return (
    <section className="analysis-view" aria-labelledby="past-results-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Past-results comparison</p>
          <h2 id="past-results-heading">How Tempo timing would have performed</h2>
          <p>A modelled replay of past prices and household demand. The source may include synthetic training data.</p>
        </div>
        <div className="analysis-filters">
          <label><span className="sr-only">Appliance</span><select value={appliance} onChange={event => setAppliance(event.target.value)}><option>EV Charging</option><option>Heat Pump</option><option>Washing Machine</option><option>Home Battery</option></select></label>
          <div className="segmented" aria-label="Comparison period">{[14,30,60].map(value => <button key={value} className={days === value ? 'active' : ''} onClick={() => setDays(value)}>{value} days</button>)}</div>
        </div>
      </div>

      <dl className="analysis-metrics four">
        <div><dt>Estimated bill saving</dt><dd>{money(backtestData?.savings_pounds)}</dd><small>{percent(backtestData?.savings_pct)} compared with usual timing</small></div>
        <div><dt>Estimated carbon reduction</dt><dd>{backtestData?.carbon_saved_kg == null ? '—' : `${backtestData.carbon_saved_kg} kg`}</dd><small>{percent(backtestData?.carbon_saved_pct)} lower</small></div>
        <div><dt>Times waiting cost more</dt><dd>{percent(backtestData?.regret_rate_pct)}</dd><small>{backtestData?.avg_regret_loss_pence == null ? 'No result yet' : `Average difference ${backtestData.avg_regret_loss_pence}p`}</small></div>
        <div><dt>Saving captured</dt><dd>{percent(backtestData?.oracle_efficiency_pct)}</dd><small>Compared with knowing prices in advance</small></div>
      </dl>

      {loading ? <div className="loading-row">Loading the comparison…</div> : error ? <div className="empty-state" role="status">{error}</div> : <PlotlyChart data={chartData} layout={layout} style={{ height:'390px' }} ariaLabel={`${days}-day cost comparison for ${appliance}`} />}
    </section>
  );
}
