import { useCallback, useEffect, useState } from 'react';
import PlotlyChart from './PlotlyChart';

const display = value => value ?? '—';

export default function GridStaggerSimulator() {
  const [numHouseholds, setNumHouseholds] = useState(500);
  const [substationCapacity, setSubstationCapacity] = useState(2000);
  const [adoptionRate, setAdoptionRate] = useState(0.85);
  const [simResults, setSimResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/simulate-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_households: Number.parseInt(numHouseholds, 10),
          substation_capacity_kw: Number.parseFloat(substationCapacity),
          adoption_rate: Number.parseFloat(adoptionRate),
        }),
      });
      if (!response.ok) throw new Error('Simulation unavailable');
      setSimResults(await response.json());
    } catch {
      setError('The neighbourhood simulation is unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, [adoptionRate, numHouseholds, substationCapacity]);

  useEffect(() => { runSimulation(); }, [runSimulation]);

  const chartData = simResults ? [
    { x:simResults.time_labels, y:simResults.transformer_limit_curve, name:'Substation capacity', type:'scatter', mode:'lines', line:{ color:'#e4694c', width:2, dash:'dash' }, hovertemplate:'Capacity: %{y:.0f} kW<extra></extra>' },
    { x:simResults.time_labels, y:simResults.uncoordinated_curve, name:'Everyone starts together', type:'scatter', mode:'lines', line:{ color:'#565b72', width:2 }, hovertemplate:'Uncoordinated demand: %{y:.1f} kW<extra></extra>' },
    { x:simResults.time_labels, y:simResults.staggered_curve, name:'Tempo spreads start times', type:'scatter', mode:'lines', line:{ color:'#2338d4', width:3 }, hovertemplate:'Coordinated demand: %{y:.1f} kW<extra></extra>' },
    { x:simResults.time_labels, y:simResults.base_load_curve, name:'Normal household demand', type:'scatter', mode:'lines', line:{ color:'#aeb4d0', width:1.5, dash:'dot' }, hovertemplate:'Normal demand: %{y:.1f} kW<extra></extra>' },
  ] : [];

  const layout = {
    showlegend:true,
    xaxis:{ title:'Time of day', gridcolor:'#f1f3fc', tickfont:{ size:10 } },
    yaxis:{ title:'Neighbourhood demand (kW)', gridcolor:'#dfe2ee', zeroline:false },
    legend:{ orientation:'h', x:0, y:1.13, font:{ size:10 } },
    margin:{ t:58, r:18, b:58, l:64 },
  };

  return (
    <section className="analysis-view" aria-labelledby="grid-simulation-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Neighbourhood simulation</p>
          <h2 id="grid-simulation-heading">What if everyone waits for the cheapest hour?</h2>
          <p>Compare a rush of simultaneous starts with Tempo spreading them across nearby low-cost times.</p>
        </div>
        <span className="source-note">Simulated results</span>
      </div>

      <div className="analysis-controls">
        <label><span>Homes</span><strong>{numHouseholds}</strong><input type="range" min="100" max="1200" step="50" value={numHouseholds} onChange={event => setNumHouseholds(Number(event.target.value))} /></label>
        <label><span>Substation capacity</span><strong>{(substationCapacity / 1000).toFixed(1)} MW</strong><input type="range" min="1200" max="3500" step="100" value={substationCapacity} onChange={event => setSubstationCapacity(Number(event.target.value))} /></label>
        <label><span>Homes following staggered advice</span><strong>{Math.round(adoptionRate * 100)}%</strong><input type="range" min="0.2" max="1" step="0.05" value={adoptionRate} onChange={event => setAdoptionRate(Number(event.target.value))} /></label>
        <button className="secondary-button" onClick={runSimulation} disabled={loading}>{loading ? 'Updating…' : 'Run again'}</button>
      </div>

      {error ? <div className="empty-state" role="status">{error}</div> : <PlotlyChart data={chartData} layout={layout} style={{ height:'410px' }} ariaLabel="Neighbourhood electricity demand with coordinated and uncoordinated appliance start times" />}

      <dl className="analysis-metrics">
        <div><dt>Peak reduction</dt><dd>{simResults ? `${display(simResults.peak_reduction_kw)} kW` : '—'}</dd><small>{simResults ? `${display(simResults.peak_reduction_pct)}% lower` : 'Waiting for results'}</small></div>
        <div><dt>Overload avoided</dt><dd>{simResults ? (simResults.transformer_overload_prevented ? 'Yes' : 'No overload detected') : '—'}</dd><small>Based on the selected capacity</small></div>
        <div><dt>Potential savings kept</dt><dd>{simResults?.savings_preserved_pct != null ? `${simResults.savings_preserved_pct}%` : '—'}</dd><small>Compared with starting at the cheapest instant</small></div>
      </dl>
    </section>
  );
}
