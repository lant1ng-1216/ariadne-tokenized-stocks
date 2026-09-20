# Figure Contracts — Audited Experiment Figures

## Figure A: Empirical latency distributions

Core conclusion: Ariadne's observed request latency varies by scenario, and the experiment records preserve the full empirical distribution rather than only a mean.

Evidence: 105 audited request records from `readonly.jsonl` and `safety.jsonl`; each curve is an ECDF over observed `latency_ms` values.

Limitation: These are development-time observations under the recorded environment, not production SLO estimates.

## Figure B: Observed response classification heatmap

Core conclusion: Ariadne preserves distinct observed response classes across read, preparation, safety, and retry scenarios rather than collapsing all requests into a generic success/failure state.

Evidence: audited `response_class` values grouped by `scenario_id`.

Limitation: Cell counts describe this experiment set and are not population incidence rates.

## Export contract

Both figures are exported as editable SVG/PDF and 600 dpi PNG/TIFF. No signing, broadcast, or transaction execution is included.
