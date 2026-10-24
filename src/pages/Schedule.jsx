import React from 'react';

const parseHour = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
};

const COLOR = {
  running:   'var(--lime)',
  scheduled: 'var(--cyan)',
  waiting:   'var(--amber)',
  done:      '#1e3050',
};

const STATUS_LABEL = {
  running:   'Running',
  scheduled: 'Scheduled',
  waiting:   'Waiting',
  done:      'Done',
};

const HOUR_MARKS = [0, 6, 12, 18, 24];

export default function Schedule({ household }) {
  const NOW_H = 17.16; // 17:10 current time

  const apps = household.appliances;
  const todaySaved = apps.reduce((s, a) => s + a.saving, 0).toFixed(2);
  const runningNow = apps.filter(a => a.status === 'running');

  return (
    <>
      <div className="page-header">
        <div className="page-title">Today's Schedule</div>
        <div className="page-sub">{household.name} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>

      {/* ── Summary Row ── */}
      <div className="grid-3 mb-4">
        <div className="card card-sm">
          <div className="stat-label">Tasks Today</div>
          <div className="stat-value cyan">{apps.length}</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Total Savings</div>
          <div className="stat-value lime">£{todaySaved}</div>
        </div>
        <div className="card card-sm">
          <div className="stat-label">Running Now</div>
          <div className="stat-value amber">{runningNow.length}</div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="card mb-4">
        <div className="section-label">24-Hour Timeline</div>

        <div className="timeline-wrap">
          {apps.map(app => {
            const startH = parseHour(app.start);
            const endH   = parseHour(app.end === '00:00' ? '24:00' : app.end);
            const left  = `${(startH / 24) * 100}%`;
            const width = `${Math.max(((endH - startH) / 24) * 100, 1.5)}%`;
            const color = COLOR[app.status];

            return (
              <div key={app.id} className="timeline-row">
                <div className="timeline-label">
                  {app.icon} {app.name}
                </div>
                <div className="timeline-track">
                  {/* NOW line */}
                  <div
                    className="timeline-now-line"
                    style={{ left: `${(NOW_H / 24) * 100}%` }}
                  />
                  {/* Bar */}
                  <div
                    className="timeline-bar"
                    style={{
                      left, width,
                      background: `${color}22`,
                      borderLeft: `2px solid ${color}`,
                    }}
                  >
                    <span className="timeline-bar-text">{app.start}–{app.end}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour labels */}
        <div className="timeline-hours">
          {HOUR_MARKS.map(h => (
            <span key={h} className="timeline-hour-tick">
              {h === 0 ? '12am' : h === 12 ? '12pm' : h === 24 ? '' : h < 12 ? `${h}am` : `${h - 12}pm`}
            </span>
          ))}
        </div>
      </div>

      {/* ── Detailed list ── */}
      <div className="card">
        <div className="section-label">Appliance Details</div>
        {apps.map(app => (
          <div key={app.id} className="appliance-row">
            <div className="appliance-icon-wrap">
              <span style={{ fontSize: 20 }}>{app.icon}</span>
            </div>
            <div className="appliance-info">
              <div className="appliance-name">{app.name}</div>
              <div className="appliance-detail">{app.start} → {app.end}</div>
            </div>
            <div className="appliance-right">
              <span
                className="badge"
                style={{
                  color: COLOR[app.status],
                  borderColor: `${COLOR[app.status]}50`,
                  background: `${COLOR[app.status]}12`,
                }}
              >
                {STATUS_LABEL[app.status]}
              </span>
              <span className="appliance-saving">£{app.saving.toFixed(2)} saved</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
