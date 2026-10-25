import { useEffect, useState } from 'react';
import PlotlyChart from './PlotlyChart.jsx';
import { formatMoney } from '../scheduling/money.js';

const timeLabel = value => new Date(value).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

export default function ForecastRadar({ household }) {
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tariffMode, setTariffMode] = useState('agile');

  useEffect(() => {
    setLoading(true);
    fetch('/api/forecast')
      .then(response => {
        if (!response.ok) throw new Error('Forecast unavailable');
        return response.json();
      })
      .then(data => setForecastData(data.forecast || []))
      .catch(() => setError('The price outlook is unavailable right now.'))
      .finally(() => setLoading(false));
  }, []);

  const prices = forecastData.map(slot => {
    if (tariffMode === 'flat') return 27.5;
    if (tariffMode === 'tracker') return Math.round((slot.spot_rate * .7 + 6) * 10) / 10;
    return slot.spot_rate;
  });
  const publishedPrices = prices.filter((_, index) => forecastData[index]?.is_auction_cleared);
  const peakThreshold = publishedPrices.length ? [...publishedPrices].sort((a,b) => a-b)[Math.max(0, Math.floor(publishedPrices.length * .85))] : Infinity;
  const labels = forecastData.map(slot => timeLabel(slot.valid_from));
  const xValues = forecastData.map(slot => slot.valid_from);
  const lowestIndex = prices.length ? prices.indexOf(Math.min(...prices)) : -1;
  const publishedIndexes = forecastData.map((slot, index) => slot.is_auction_cleared ? index : -1).filter(index => index >= 0);
  const peakIndex = publishedIndexes.length ? publishedIndexes.reduce((best, index) => prices[index] > prices[best] ? index : best, publishedIndexes[0]) : -1;
  const forecastIndex = forecastData.findIndex(slot => !slot.is_auction_cleared);
  const planned = household?.appliances.find(item => item.status === 'scheduled');
  const plannedStartIndex = planned ? labels.findIndex(label => label === planned.start) : -1;
  const plannedEndIndex = plannedStartIndex >= 0 ? labels.findIndex((label, index) => index > plannedStartIndex && label === planned.end) : -1;

  const data = forecastData.length ? [
    {
      x:xValues, y:prices.map((price,index) => forecastData[index].is_auction_cleared && price < peakThreshold ? price : null),
      name:'Published price', type:'bar', marker:{ color:'#11162b' }, hovertemplate:'%{x}<br>%{y:.1f}p per kWh<extra></extra>',
    },
    {
      x:xValues, y:prices.map((price,index) => forecastData[index].is_auction_cleared && price >= peakThreshold ? price : null),
      name:'Peak published price', type:'bar', marker:{ color:'#e4694c' }, hovertemplate:'%{x}<br>%{y:.1f}p per kWh<extra></extra>',
    },
    {
      x:xValues, y:prices.map((price,index) => !forecastData[index].is_auction_cleared ? price : null),
      name:'Forecast price', type:'bar',
      marker:{ color:'rgba(255,255,255,0)', line:{ color:'#11162b', width:1 } },
      error_y:{
        type:'data', visible:tariffMode === 'agile',
        array:forecastData.map(slot => !slot.is_auction_cleared ? Math.max(0, slot.p90 - slot.p50) : 0),
        arrayminus:forecastData.map(slot => !slot.is_auction_cleared ? Math.max(0, slot.p50 - slot.p10) : 0),
        color:'#565b72', thickness:1, width:2,
      },
      hovertemplate:'%{x}<br>%{y:.1f}p per kWh<extra></extra>',
    },
  ] : [];

  const annotations = [];
  if (peakIndex >= 0) annotations.push({ x:xValues[peakIndex], y:prices[peakIndex], text:`Peak ${prices[peakIndex].toFixed(1)}p · ${labels[peakIndex]}`, showarrow:true, arrowhead:0, ay:-32, font:{ size:11, color:'#11162b' } });
  if (lowestIndex >= 0) annotations.push({ x:xValues[lowestIndex], y:prices[lowestIndex], text:`Lowest ${prices[lowestIndex].toFixed(1)}p · ${labels[lowestIndex]}`, showarrow:true, arrowhead:0, ay:34, font:{ size:11, color:'#2338d4' } });
  if (forecastIndex >= 0) annotations.push({ x:xValues[forecastIndex], y:1, yref:'paper', text:'Published  |  Forecast', showarrow:false, yshift:16, font:{ size:11, color:'#565b72' } });
  if (plannedStartIndex >= 0) annotations.push({ x:xValues[plannedStartIndex], y:1, yref:'paper', text:`${planned.name} · ${planned.start}–${planned.end}`, showarrow:false, yshift:38, font:{ size:10, color:'#2338d4' } });

  const shapes = [];
  if (forecastIndex >= 0) shapes.push({ type:'line', x0:xValues[forecastIndex], x1:xValues[forecastIndex], y0:0, y1:1, yref:'paper', line:{ color:'#565b72', width:1, dash:'dot' } });
  if (plannedStartIndex >= 0) shapes.push({ type:'rect', x0:xValues[plannedStartIndex], x1:xValues[plannedEndIndex >= 0 ? plannedEndIndex : plannedStartIndex], y0:0, y1:1, yref:'paper', fillcolor:'rgba(35,56,212,.08)', line:{ color:'rgba(35,56,212,.45)', width:1 }, layer:'below' });

  const layout = {
    barmode:'overlay', bargap:.12, showlegend:false, annotations, shapes,
    font:{ family:'IBM Plex Sans', color:'#565b72' },
    xaxis:{ type:'date', tickformat:'%H:%M', dtick:14400000, tickfont:{ size:10, color:'#565b72' }, gridcolor:'rgba(0,0,0,0)', fixedrange:true },
    yaxis:{ title:'pence per kWh', titlefont:{ size:11, color:'#565b72' }, tickfont:{ size:10, color:'#565b72' }, gridcolor:'#dfe2ee', zerolinecolor:'#11162b', fixedrange:true },
    margin:{ t:54, r:18, b:52, l:48 },
  };

  return (
    <section className="forecast-section hairline-section" aria-labelledby="forecast-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Electricity price outlook</p><h2 id="forecast-heading">The next 24–48 hours</h2><p>Solid bars are published prices. Outlined bars are forecasts; their lines show the likely range.</p></div>
        <div className="segmented" aria-label="Tariff comparison">{[{id:'agile',label:'Octopus Agile'},{id:'tracker',label:'Tracker'},{id:'flat',label:'Standard'}].map(item => <button key={item.id} className={tariffMode === item.id ? 'active' : ''} onClick={() => setTariffMode(item.id)}>{item.label}</button>)}</div>
      </div>
      {loading ? <div className="loading-row">Loading published prices and forecasts…</div> : error ? <div className="empty-state" role="status">{error}</div> : (
        <>
          <div className="forecast-chart">
            <PlotlyChart data={data} layout={layout} style={{ height:'420px' }} ariaLabel="Half-hourly electricity price bars showing published prices, forecast prices and likely ranges" />
          </div>
          <div className="appliance-timeline edge-fade" aria-label="Appliance schedule aligned to the price horizon">
            {household.appliances.map(item => <div className="appliance-timeline-row" key={item.id}><strong>{item.name}</strong><div className="timeline-line"><span style={{ left:`${(Number(item.start.slice(0,2)) / 24) * 100}%`, width:`${Math.max(4, ((Number(item.end.slice(0,2)) - Number(item.start.slice(0,2)) + 24) % 24) / 24 * 100)}%` }} /></div><span>{item.start}–{item.end} · {item.status}</span><b>{formatMoney(item.saving)} estimated saving</b></div>)}
          </div>
        </>
      )}
    </section>
  );
}
