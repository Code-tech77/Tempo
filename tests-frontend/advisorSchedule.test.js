import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdvisorScheduleEntry, upsertAppliance } from '../src/scheduling/advisorSchedule.js';

const preset = { id:'battery', name:'Home Battery' };
const result = {
  decision:'WAIT',
  optimal_start_time:'2026-10-26T02:30:00Z',
  optimal_end_time:'2026-10-26T05:30:00Z',
  expected_saving_pence:112,
  carbon_saved_kg:1.5,
};

test('Smart Advisor recommendation becomes a Schedule-compatible entry', () => {
  const entry = createAdvisorScheduleEntry({ preset, powerKw:3.5, durationHours:3, result });
  assert.deepEqual(entry, {
    id:'battery', name:'Home Battery', icon:'HB', kw:3.5, status:'scheduled',
    start:'02:30', end:'05:30', saving:1.12, carbon:1.5, source:'Smart Advisor',
  });
});

test('adding an Advisor entry inserts once and later recommendations update it', () => {
  const initial = [{ id:'ev', name:'EV Charger' }];
  const entry = createAdvisorScheduleEntry({ preset, powerKw:3.5, durationHours:3, result });
  const added = upsertAppliance(initial, entry);
  assert.equal(added.length, 2);
  assert.equal(added[1].start, '02:30');
  const updated = upsertAppliance(added, { ...entry, start:'03:00' });
  assert.equal(updated.length, 2);
  assert.equal(updated.find(item => item.id === 'battery').start, '03:00');
});
