import { clarificationFixture, impossibleFixture, serverErrorFixture, successFixture } from './scheduleFixtures.js';

/** @typedef {import('./scheduleFixtures.js').RiskAppetite} RiskAppetite */
/** @typedef {{user_prompt:string, current_time_iso:string, carbon_weight:number, risk_appetite:RiskAppetite}} ParseAndScheduleRequest */

export const EXAMPLES = [
  { label: 'EV charging', text: 'Charge my EV with 14 kWh before I leave tomorrow at 7:30am. It can charge in separate half-hour slots.' },
  { label: 'Dishwasher', text: 'Run the dishwasher for 2 hours, finished by 6:30am tomorrow. Keep the cycle together.' },
  { label: 'Washing machine', text: 'Run the washing machine for 90 minutes before 8am tomorrow. It must run as one cycle.' },
];

/** @param {{userPrompt:string, carbonWeight:number, riskAppetite:RiskAppetite, now?:Date}} values
 * @returns {ParseAndScheduleRequest} */
export function buildScheduleRequest({ userPrompt, carbonWeight, riskAppetite, now = new Date() }) {
  const prompt = userPrompt.trim();
  if (prompt.length < 3) throw new TypeError('Describe the appliance schedule in at least 3 characters.');
  if (prompt.length > 4000) throw new TypeError('The schedule description must be 4,000 characters or fewer.');
  if (!Number.isFinite(carbonWeight) || carbonWeight < 0 || carbonWeight > 1) {
    throw new TypeError('Carbon preference must be between 0 and 1.');
  }
  if (!['safe', 'balanced', 'aggressive'].includes(riskAppetite)) throw new TypeError('Choose a valid risk appetite.');
  return {
    user_prompt: prompt,
    current_time_iso: now.toISOString(),
    carbon_weight: carbonWeight,
    risk_appetite: riskAppetite,
  };
}

const MOCK_STATE = import.meta.env?.VITE_TEMPO_MOCK_STATE || 'success';
const API_BASE_URL = import.meta.env?.VITE_TEMPO_API_URL || '';

async function mockTransport(mockState) {
  await new Promise(resolve => setTimeout(resolve, 650));
  if (mockState === 'network_error') throw new TypeError('Network request failed. Check your connection and try again.');
  if (mockState === 'server_error') {
    const error = new Error(serverErrorFixture.message);
    error.status = serverErrorFixture.status;
    throw error;
  }
  if (mockState === 'clarification') return structuredClone(clarificationFixture);
  if (mockState === 'impossible') return structuredClone(impossibleFixture);
  if (mockState !== 'success') throw new TypeError(`Unknown TEMPO mock state: ${mockState}`);
  return structuredClone(successFixture);
}

async function apiTransport(request) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/parse-and-schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
    });
  } catch {
    throw new TypeError('Could not reach the scheduling service. Check that the backend is running and try again.');
  }
  if (!response.ok) {
    const error = new Error(response.status === 422
      ? 'The schedule request was invalid. Check the description and try again.'
      : response.status >= 500
        ? 'The scheduling service is unavailable right now. Please try again.'
        : `The scheduling request failed (${response.status}). Please try again.`);
    error.status = response.status;
    throw error;
  }
  try {
    return await response.json();
  } catch {
    throw new Error('The service returned an unexpected response. Please try again.');
  }
}

/** Explicit transport switch: mock failures never fall through to the live API. */
export function createScheduleTransport(mode = import.meta.env?.VITE_TEMPO_TRANSPORT || 'api', mockState = MOCK_STATE) {
  if (mode === 'mock') return { mode, submit: () => mockTransport(mockState) };
  if (mode === 'api') return { mode, submit: apiTransport };
  throw new TypeError(`Unknown TEMPO transport mode: ${mode}`);
}

/** @returns {string} Convert a UTC slot to a readable local time without losing the UTC source. */
export function formatSlot(slot) {
  const normalized = slot.includes('T') ? slot : `2000-01-01T${slot.replace('Z', '')}:00Z`;
  const date = new Date(normalized);
  return `${new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date)} (${slot} UTC)`;
}

export function getResponseMessage(response) {
  if (!response || !['success', 'needs_clarification', 'impossible_constraint'].includes(response.status)) {
    throw new Error('The service returned an unexpected response. Please try again.');
  }
  if (response.status === 'success' && (!response.scenarios || !response.parsed_constraints || response.needs_clarification)) {
    throw new Error('The service returned an incomplete schedule. Please try again.');
  }
  if (response.status !== 'success' && (!response.needs_clarification || !response.clarification_message || response.scenarios)) {
    throw new Error('The service returned an inconsistent schedule response. Please try again.');
  }
  return response.clarification_message;
}
