import Reveal from '../components/Reveal.jsx';
import { formatMoney } from '../scheduling/money.js';

const parseHour = value => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours + minutes / 60;
};
const STATUS_LABEL = { running:'Running now', scheduled:'Scheduled', waiting:'Waiting', done:'Complete' };
const HOUR_MARKS = [0, 6, 12, 18, 24];

export default function Schedule({ household, notice = '' }) {
  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const appliances = household.appliances;
  const totalSaving = appliances.reduce((sum, appliance) => sum + appliance.saving, 0);
  const runningNow = appliances.filter(appliance => appliance.status === 'running').length;

  return (
    <div className="schedule-page">
      <Reveal className="page-header">
        <p className="eyebrow">Household schedule</p>
        <h1 className="page-title">Today, at a glance</h1>
        <p className="page-sub">{household.name} · {now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}</p>
      </Reveal>

      {notice && <p className="schedule-confirmation" role="status">{notice}</p>}

      <Reveal as="dl" className="metric-grid">
        <div className="metric"><dt className="metric-label">Appliances today</dt><dd className="metric-value">{appliances.length}</dd><small className="metric-note">Across this household</small></div>
        <div className="metric"><dt className="metric-label">Estimated saving</dt><dd className="metric-value">{formatMoney(totalSaving)}</dd><small className="metric-note">Compared with usual timing</small></div>
        <div className="metric"><dt className="metric-label">Running now</dt><dd className="metric-value">{runningNow}</dd><small className="metric-note">Connected appliance{runningNow === 1 ? '' : 's'}</small></div>
      </Reveal>

      <Reveal className="schedule-timeline hairline-section">
        <div className="section-heading"><div><p className="eyebrow">24-hour timeline</p><h2>When everything runs</h2></div><p>The blue line marks your current local time.</p></div>
        <div className="timeline-wrap">
          {appliances.map(appliance => {
            const start = parseHour(appliance.start);
            const finish = parseHour(appliance.end === '00:00' ? '24:00' : appliance.end);
            return (
              <div key={appliance.id} className="timeline-row">
                <div className="timeline-label"><strong>{appliance.name}</strong><span>{STATUS_LABEL[appliance.status]}</span></div>
                <div className="timeline-track">
                  <span className="timeline-now-line" style={{ left:`${(nowHour / 24) * 100}%` }} />
                  <span className={`timeline-bar status-${appliance.status}`} style={{ left:`${(start / 24) * 100}%`, width:`${Math.max(((finish - start) / 24) * 100, 1.5)}%` }}><span>{appliance.start}–{appliance.end}</span></span>
                </div>
              </div>
            );
          })}
          <div className="timeline-hours">{HOUR_MARKS.map(hour => <span key={hour}>{hour === 24 ? '' : `${String(hour).padStart(2,'0')}:00`}</span>)}</div>
        </div>
      </Reveal>

      <Reveal className="schedule-list hairline-section">
        <div className="section-heading"><div><p className="eyebrow">Appliance detail</p><h2>Your connected plan</h2></div></div>
        {appliances.map(appliance => (
          <div key={appliance.id} className="schedule-list-row">
            <span className="appliance-initials" aria-hidden="true">{appliance.icon}</span>
            <div><strong>{appliance.name}</strong><span>{appliance.start}–{appliance.end} · {appliance.kw} kW</span></div>
            <span className={`status-text status-${appliance.status}`}>{STATUS_LABEL[appliance.status]}</span>
            <strong>{formatMoney(appliance.saving)} estimated saving</strong>
          </div>
        ))}
      </Reveal>
    </div>
  );
}
