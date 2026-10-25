const UK_TIME_ZONE = 'Europe/London';

function timeLabel(value) {
  return new Intl.DateTimeFormat('en-GB', {
    hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZone:UK_TIME_ZONE,
  }).format(value);
}

function poundsValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createAdvisorScheduleEntry({ preset, powerKw, durationHours, result }) {
  if (!preset || !result) throw new TypeError('A selected appliance and recommendation are required.');
  const start = new Date(result.optimal_start_time);
  if (Number.isNaN(start.getTime())) throw new TypeError('The recommendation has no valid start time.');
  const suppliedEnd = new Date(result.optimal_end_time);
  const end = Number.isNaN(suppliedEnd.getTime())
    ? new Date(start.getTime() + Number(durationHours) * 60 * 60 * 1000)
    : suppliedEnd;
  const saving = typeof result.expected_saving_pence === 'number'
    ? result.expected_saving_pence / 100
    : poundsValue(result.expected_saving_pounds);
  const carbon = Number(result.carbon_saved_kg);
  return {
    id:preset.id,
    name:preset.name,
    icon:preset.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase(),
    kw:Number(powerKw),
    status:result.decision === 'RUN_NOW' ? 'running' : 'scheduled',
    start:timeLabel(start),
    end:timeLabel(end),
    saving:Number.isFinite(saving) ? saving : 0,
    carbon:Number.isFinite(carbon) ? carbon : 0,
    source:'Smart Advisor',
  };
}

export function upsertAppliance(appliances, entry) {
  const existingIndex = appliances.findIndex(appliance => appliance.id === entry.id);
  if (existingIndex < 0) return [...appliances, entry];
  return appliances.map((appliance, index) => index === existingIndex ? entry : appliance);
}
