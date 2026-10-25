const GBP_FORMAT = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a signed GBP value consistently across the Stage E planner.
 * Negative energy charges can be described as credits, while negative
 * comparisons retain their minus sign so a loss is never presented as saving.
 */
export function formatMoney(value, { negativeAsCredit = false } = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Unavailable';

  const isNegative = amount < 0;
  const formattedAmount = GBP_FORMAT.format(Math.abs(amount));
  if (isNegative && negativeAsCredit) return `Credit: £${formattedAmount}`;
  return `${isNegative ? '−' : ''}£${formattedAmount}`;
}

/**
 * Prefer the explicit Stage D baseline. During the parallel rollout, derive
 * the old-response baseline from the two values already returned by Stage C.
 */
export function getBaselineCost(scenario) {
  if (typeof scenario.baseline_cost_gbp === 'number' && Number.isFinite(scenario.baseline_cost_gbp)) {
    return scenario.baseline_cost_gbp;
  }
  return Number(scenario.estimated_cost_gbp) + Number(scenario.savings_vs_now_gbp);
}
