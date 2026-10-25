import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduleRequest, createScheduleTransport, formatScheduleRange, formatSlot, formatSlotTime, getResponseMessage } from '../src/scheduling/scheduleApi.js';
import { clarificationFixture, impossibleFixture, successFixture } from '../src/scheduling/scheduleFixtures.js';
import { formatMoney, getBaselineCost } from '../src/scheduling/money.js';

test('request construction mirrors the locked request and uses UTC', () => {
  const request = buildScheduleRequest({
    userPrompt: '  Charge my EV before 7am  ', carbonWeight: 0.45, riskAppetite: 'safe',
    now: new Date('2026-10-24T17:10:00.000Z'),
  });
  assert.deepEqual(request, {
    user_prompt: 'Charge my EV before 7am', current_time_iso: '2026-10-24T17:10:00.000Z',
    carbon_weight: 0.45, risk_appetite: 'safe',
  });
  assert.throws(() => buildScheduleRequest({ userPrompt: 'x', carbonWeight: 0.3, riskAppetite: 'balanced' }), /at least 3/);
  assert.throws(() => buildScheduleRequest({ userPrompt: 'valid text', carbonWeight: 2, riskAppetite: 'balanced' }), /between 0 and 1/);
});

test('live request construction uses the browser current UTC time', () => {
  const before = Date.now();
  const request = buildScheduleRequest({
    userPrompt: 'Run the dishwasher tomorrow morning', carbonWeight: 0.3, riskAppetite: 'balanced',
  });
  const after = Date.now();
  const requestTime = Date.parse(request.current_time_iso);
  assert.ok(requestTime >= before && requestTime <= after);
  assert.match(request.current_time_iso, /Z$/);
});

test('transport switches explicitly between fixture and live API', async () => {
  const mock = await createScheduleTransport('mock').submit({});
  assert.equal(mock.status, 'success');
  assert.equal(createScheduleTransport('mock').mode, 'mock');
  assert.equal(createScheduleTransport('api').mode, 'api');
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => successFixture };
  };
  try {
    const request = { user_prompt: 'Charge my EV before 7am', current_time_iso: '2026-10-24T17:10:00Z', carbon_weight: 0.3, risk_appetite: 'balanced' };
    const response = await createScheduleTransport('api').submit(request);
    assert.equal(response.status, 'success');
    assert.equal(captured.url, '/api/parse-and-schedule');
    assert.deepEqual(JSON.parse(captured.options.body), request);
  } finally { globalThis.fetch = originalFetch; }
});

test('representative response states preserve the locked success and clarification structure', () => {
  assert.equal(successFixture.status, 'success');
  assert.deepEqual(Object.keys(successFixture.scenarios), ['earliest_interpretation', 'expected_interpretation', 'latest_interpretation']);
  assert.equal(getResponseMessage(clarificationFixture), clarificationFixture.clarification_message);
  assert.equal(getResponseMessage(impossibleFixture), impossibleFixture.clarification_message);
  assert.throws(() => getResponseMessage({ status: 'success' }), /incomplete schedule/);
  assert.throws(() => getResponseMessage({ status: 'unknown' }), /unexpected response/);
});

test('scenario fixtures include reproducible baselines and preserve exact scenario keys', () => {
  const expectedKeys = ['earliest_interpretation', 'expected_interpretation', 'latest_interpretation'];
  assert.deepEqual(Object.keys(successFixture.scenarios), expectedKeys);
  for (const scenario of Object.values(successFixture.scenarios)) {
    assert.equal(typeof scenario.baseline_cost_gbp, 'number');
    assert.ok(Math.abs((scenario.baseline_cost_gbp - scenario.estimated_cost_gbp) - scenario.savings_vs_now_gbp) < 1e-9);
  }
});

test('money formatting supports credits, signed losses, and old-response baseline fallback', () => {
  assert.equal(formatMoney(-0.12, { negativeAsCredit: true }), 'Credit: £0.12');
  assert.equal(formatMoney(-0.12), '−£0.12');
  assert.equal(formatMoney(0), '£0.00');
  assert.equal(getBaselineCost({ estimated_cost_gbp: 0.98, savings_vs_now_gbp: 1.08 }), 2.06);
  assert.equal(getBaselineCost({ estimated_cost_gbp: -0.12, baseline_cost_gbp: -0.4, savings_vs_now_gbp: 0.28 }), -0.4);
});

test('network and server failures are surfaced without falling back to mocks', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    await assert.rejects(createScheduleTransport('api').submit({}), /Could not reach the scheduling service/);
  } finally { globalThis.fetch = originalFetch; }
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try {
    await assert.rejects(createScheduleTransport('api').submit({}), /unavailable right now/);
  } finally { globalThis.fetch = originalFetch; }
  await assert.rejects(createScheduleTransport('mock', 'network_error').submit({}), /Network request failed/);
  await assert.rejects(createScheduleTransport('mock', 'server_error').submit({}), /temporarily unavailable/);
});

test('UTC half-hours are presented as compact UK-local times', () => {
  assert.equal(formatSlot('2026-10-26T03:00Z'), 'Mon 26 Oct, 03:00 GMT');
  assert.equal(formatSlotTime('2026-10-26T03:30Z'), '03:30');
  assert.equal(formatScheduleRange(['2026-10-26T03:00Z', '2026-10-26T03:30Z', '2026-10-26T04:00Z']), 'Mon 26 Oct, 03:00–04:30 GMT');
  assert.throws(() => createScheduleTransport('fallback'), /Unknown TEMPO transport/);
});
