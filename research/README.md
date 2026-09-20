# Research assets

This directory contains the evidence and reproducibility assets used by the Ariadne technical report.

## Principles

- Every published metric must have a source file or reproducible command.
- External blockers remain labelled as blocked or deferred.
- No private credentials, wallet secrets or local network details belong in this directory.
- Figures must be generated from these data files rather than hand-edited values.

## Data files

- `data/acceptance-summary.json` — phase acceptance totals and status definitions.
- `data/api-observations.json` — selected API and safety observations.
- `data/capability-matrix.json` — capability-level verification status.
- `experiments/records/readonly.jsonl` — append-only read and preparation observations.
- `experiments/records/safety.jsonl` — append-only safety and simulation observations.
- `experiments/audit-results.json` — machine-readable integrity and coverage audit.

## Audited experiment snapshot

The current audit is a no-signing, no-broadcast experiment. It contains 105 request records, 40 result snapshots and 5 safety-result records. All 105 request identifiers are unique; no record was broadcast; coverage gaps and audit failures are both empty. The scenario counts are:

| Scenario | Observations |
|---|---:|
| Asset resolution — Ondo | 11 |
| Asset resolution — bStocks | 11 |
| Market context | 20 |
| Standard quote preparation | 10 |
| RFQ quote preparation | 10 |
| Allowance read | 10 |
| Simulation preview | 10 |
| DeFi error handling | 3 |
| Retry policy | 20 |

These counts describe this controlled development experiment only; they are not market-share, reliability or production-incidence estimates.

## Reproducible figures

The audited experiment figures are stored in `figures/nature-sample/` in editable SVG/PDF and 600 dpi PNG/TIFF formats:

- `experiment-latency-ecdf.*` — empirical latency distributions by scenario.
- `experiment-handling-heatmap.*` — observed response classifications by scenario.

Each figure has a contract describing its claim, evidence source and limitations. Values are generated from recorded observations rather than manually entered into the artwork.
