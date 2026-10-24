/**
 * @typedef {'success'|'needs_clarification'|'impossible_constraint'} ResponseStatus
 * @typedef {'safe'|'balanced'|'aggressive'} RiskAppetite
 * @typedef {{earliest:string, expected:string, latest:string}} EvidenceQuotes
 * @typedef {{appliance:string, energy_kwh:number, is_contiguous:boolean, earliest_local:string, expected_local:string, latest_local:string, evidence:EvidenceQuotes, read_back_summary:string}} ParsedConstraints
 * @typedef {{label:string, deadline_local:string, deadline_utc:string, estimated_cost_gbp:number, savings_vs_now_gbp:number, wait_probability_pct:number, worst_case_loss_pence:number, carbon_g_co2:number, recommended_slots_utc:string[]}} ScenarioResult
 * @typedef {{earliest_interpretation:ScenarioResult, expected_interpretation:ScenarioResult, latest_interpretation:ScenarioResult}} ScenarioComparison
 * @typedef {{status:ResponseStatus, needs_clarification:boolean, clarification_message:string|null, validation_warning:string|null, parsed_constraints:ParsedConstraints|null, scenarios:ScenarioComparison|null, flexibility_spread_pence:number|null}} ParseAndScheduleResponse
 */

/** @type {ParseAndScheduleResponse} */
export const successFixture = {
  status: 'success', needs_clarification: false, clarification_message: null,
  validation_warning: null,
  parsed_constraints: {
    appliance: 'ev_charger', energy_kwh: 14, is_contiguous: false,
    earliest_local: '07:00 BST', expected_local: '07:30 BST', latest_local: '08:15 BST',
    evidence: {
      earliest: 'no earlier than 7:00am', expected: 'usually leave around 7:30am',
      latest: 'maybe 8:15am',
    },
    read_back_summary: 'Charge the EV with 14 kWh before you leave. Charging may be split across half-hour slots.',
  },
  scenarios: {
    earliest_interpretation: {
      label: 'Earliest', deadline_local: '07:00 BST', deadline_utc: '2026-10-25T06:00:00Z',
      estimated_cost_gbp: 1.14, savings_vs_now_gbp: 0.92, wait_probability_pct: 77,
      worst_case_loss_pence: 8, carbon_g_co2: 1260,
      recommended_slots_utc: ['2026-10-25T01:00Z', '2026-10-25T01:30Z', '2026-10-25T02:00Z'],
    },
    expected_interpretation: {
      label: 'Expected', deadline_local: '07:30 BST', deadline_utc: '2026-10-25T06:30:00Z',
      estimated_cost_gbp: 0.98, savings_vs_now_gbp: 1.08, wait_probability_pct: 84,
      worst_case_loss_pence: 6, carbon_g_co2: 1120,
      recommended_slots_utc: ['2026-10-25T02:00Z', '2026-10-25T02:30Z', '2026-10-25T03:00Z'],
    },
    latest_interpretation: {
      label: 'Latest', deadline_local: '08:15 BST', deadline_utc: '2026-10-25T07:15:00Z',
      estimated_cost_gbp: 0.72, savings_vs_now_gbp: 1.34, wait_probability_pct: 89,
      worst_case_loss_pence: 4, carbon_g_co2: 980,
      recommended_slots_utc: ['2026-10-25T03:00Z', '2026-10-25T03:30Z', '2026-10-25T04:00Z'],
    },
  },
  flexibility_spread_pence: 42,
};

/** @type {ParseAndScheduleResponse} */
export const clarificationFixture = {
  status: 'needs_clarification', needs_clarification: true,
  clarification_message: 'How much energy should the EV receive, or how long should it charge?',
  validation_warning: null, parsed_constraints: null, scenarios: null,
  flexibility_spread_pence: null,
};

/** @type {ParseAndScheduleResponse} */
export const impossibleFixture = {
  status: 'impossible_constraint', needs_clarification: true,
  clarification_message: 'The requested 40 kWh cannot be delivered before 06:00 with a 7 kW charger.',
  validation_warning: 'The available charging window is shorter than the required run time.',
  parsed_constraints: null, scenarios: null, flexibility_spread_pence: null,
};

export const serverErrorFixture = {
  kind: 'server', status: 503, message: 'The scheduling service is temporarily unavailable.',
};
