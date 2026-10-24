# Tempo Engineering Instructions

## Mission

Build Tempo as a household energy decision engine whose primary goal is to reduce the user's electricity cost by matching half-hourly energy prices to the times when their appliances can run.

The product must answer a practical question: given the price schedule and the user's real availability, when should the appliance run, how much should that cost, and how much should the user save compared with running it now or at their usual time?

Human schedules are part of the optimization input, not the product's main output. Gemini exists to translate natural language into usable scheduling constraints. Deterministic validation exists to prevent unsafe or misleading schedules. Neither should overshadow the cost-saving decision.

Tempo separates two different kinds of uncertainty:

1. Gemini extracts discrete interpretations of ambiguous human schedules.
2. Tempo's forecast and Monte Carlo code estimates statistical grid uncertainty.

Never describe Gemini's earliest, expected, and latest interpretations as probabilities or confidence bounds.

## Product priorities

When requirements compete, use this order:

1. Produce a physically feasible schedule within the user's availability.
2. Minimize expected electricity cost from the available half-hourly price schedule.
3. Show the monetary effect clearly: scheduled cost, savings against a meaningful baseline, and the value of additional flexibility.
4. Represent forecast risk honestly and allow carbon preference to influence the decision without hiding the cost impact.
5. Make schedule entry convenient through Gemini and presets.
6. Apply enough validation to prevent invalid schedules, fabricated evidence, and silent changes to user intent.

Do not spend implementation time making the Gemini interaction elaborate when the same effort would improve price data, schedule feasibility, optimization quality, baseline comparison, or the clarity of savings.

## Authoritative contracts

- `schemas.py` is the only source of truth for Gemini structured output and `POST /api/parse-and-schedule`.
- Import these models. Do not recreate, shadow, or loosen them in `main.py`, `scheduler.py`, tests, or frontend-oriented Python code.
- Treat field names, enum values, validation rules, and response states as locked. A contract change requires explicit human coordination because it affects the backend, validation layer, and React client.
- Reject unknown fields. Do not silently coerce malformed schedules into valid ones.

## File ownership and change boundaries

- Integration lane: `main.py` and `src/`.
- Validation and scheduling lane: `scheduler.py` and `tests/test_validation.py`.
- Core engine lane: `data_service.py`, `forecast_engine.py`, and `backtest_engine.py`.
- Treat the core engine lane as a black box unless the user explicitly asks to change it.
- Keep changes small and local. Do not perform unrelated cleanup during integration work.

## Required backend flow

1. Accept `ParseAndScheduleRequest` at `POST /api/parse-and-schedule`.
2. Use Gemini only to translate `user_prompt` plus the minimum necessary temporal context into `ScheduleExtractionSchema`. Use temperature `0.0`, read the API key from an environment variable, and never commit secrets.
3. Treat the extraction as untrusted input and apply the deterministic checks below.
4. Convert the validated availability into feasible UTC half-hour slots within the price forecast horizon.
5. Optimize each interpretation against the actual slot-level price schedule, the appliance's physical requirements, and the requested cost/carbon preference.
6. Compare every optimized schedule with an explicit baseline such as running now. Return the scheduled cost and monetary saving; do not return an unsupported savings claim.
7. Run the decision engine once for each validated deadline interpretation and calculate the monetary value of flexibility between them.
8. Verify all evidence quotes against the raw prompt using deterministic case and whitespace normalization.
9. Convert local wall-clock deadlines with `zoneinfo.ZoneInfo("Europe/London")`, then pass timezone-aware UTC values downstream.
10. Validate `start < earliest <= expected <= latest`. Never sort, swap, clamp, or otherwise repair contradictory deadlines.
11. Detect ambiguous local times during the autumn clock change. Either select `fold=0` explicitly with a visible warning or request clarification. Never resolve the fold silently.
12. Reject deadlines outside the forecast horizon and impossible energy requests with an `impossible_constraint` response containing the actual power/time calculation.

## Scheduling rules

- All solver inputs and slot identities are timezone-aware UTC.
- The price attached to each candidate slot must come from the forecast/data pipeline. Never invent a convenient demo price inside the scheduler.
- Honour quiet hours, deadline boundaries, appliance power, and the requested energy or duration.
- Dishwasher and washing-machine cycles are contiguous. EV charging may use split half-hour slots when `is_contiguous` is false.
- Cost is the primary objective. Use the requested carbon weight to make the cost/carbon trade-off visible, and use risk appetite to control exposure to uncertain future prices. Do not replace user values with demo defaults after validation.
- Return both the optimized cost and the baseline cost used to calculate savings. Savings must be reproducible from those values.
- Compute `flexibility_spread_pence` from the earliest scenario cost minus the latest scenario cost, rounded to whole pence.
- Do not return a success response unless all three scenario results are present and valid.

## Frontend rules

- The React client sends and consumes the exact `schemas.py` contract.
- Lead with the recommended run times, scheduled cost, savings against running now, and the additional saving unlocked by flexibility.
- Show three clearly labelled interpretation cards and express the flexibility spread as money.
- Show Gemini's read-back and literal evidence as supporting context so users can verify the constraints used by the optimizer.
- When `needs_clarification` is true, show the clarification message and suppress scenario cards.
- Preset fallbacks must be labelled cached demo data. Never present an invented fallback result as a live API result.
- Keep the existing forecast, herd simulation, and savings ledger accessible in the demo flow.

## Evidence and claims

- Never label generated, synthetic, or formula-derived values as real historical measurements.
- Never claim the OR-Tools model produced a schedule unless the model was actually solved and its solution was used.
- Monte Carlo probability must come from forecast-distribution sampling. Gemini output must not influence that probability except through validated scheduling constraints.
- Surface known methodological limitations in the UI or supporting documentation where a judge could otherwise misunderstand a number.

## Verification gates

- Test that optimization selects the cheapest feasible slots for controlled price curves.
- Test contiguous and split schedules, deadline boundaries, quiet hours, and cost/carbon weighting.
- Recompute each reported saving from baseline cost minus scheduled cost and assert that it matches the API response.
- Add adversarial tests for contradictory ordering, missing quotes, hallucinated quotes, impossible energy, out-of-horizon deadlines, missing schedule information, and DST ambiguity.
- Test both valid and rejected endpoint responses against the locked models.
- Confirm no validation path silently changes user intent.
- Run the relevant Python tests and `npm run build` before declaring the end-to-end flow complete.
- Keep secrets, virtual environments, caches, generated bytecode, build output, and local data out of version control.

## Definition of done

The feature is complete only when a valid prompt produces three feasible UTC schedules based on slot-level energy prices, clearly shows their costs and reproducible savings, and identifies the value of fitting energy use around the user's availability. The contradictory-prompt flow, deterministic DST behavior, frontend build, and accuracy of every displayed claim must also pass their verification gates.
