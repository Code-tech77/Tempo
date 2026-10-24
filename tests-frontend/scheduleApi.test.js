import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduleRequest, createScheduleTransport, formatSlot, getResponseMessage } from '../src/scheduling/scheduleApi.js';
import { clarificationFixture, impossibleFixture, successFixture } from '../src/scheduling/scheduleFixtures.js';

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

test('transport switches explicitly between fixture and live API', async () => {
  const mock = await createScheduleTransport('mock').submit({});
  assert.equal(mock.status, 'success');
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

test('UTC half-hour recommendation slots are presented with local time and UTC source', () => {
  const display = formatSlot('2026-10-25T02:00Z');
  assert.match(display, /2026-10-25T02:00Z UTC/);
  assert.throws(() => createScheduleTransport('fallback'), /Unknown TEMPO transport/);
});
