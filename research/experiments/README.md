# Ariadne API Evidence Experiment

## Purpose

This experiment measures the observable behavior of Ariadne's read, preparation, safety, and simulation surfaces without signing, broadcasting, or requiring wallet funds.

## Primary question

Can Ariadne preserve API semantics and convert heterogeneous responses into explicit, auditable handling states?

## Scope

Included: asset resolution, market context, quote preparation, allowance reads, simulation, DeFi-position error handling, and retry behavior.

Excluded: private-key handling, real signatures, transaction broadcast, funded-wallet balance changes, demo video, and submission materials.

## Experimental unit

One record represents one complete API invocation or one deterministic local client test. Repeated observations retain their raw response classification and are never collapsed into a success-only summary.

## Repetition target

For each read-only or quote scenario, collect 10 valid observations where the endpoint is available. Record all failed or blocked observations separately. Deterministic local tests are reported as client-behavior evidence, not production performance.

## Stopping rules

- Stop a scenario if credentials, eligibility, or network state is invalid.
- Stop before any signing or broadcast boundary.
- Do not retry a broadcast operation automatically.
- Preserve upstream errors instead of converting them to empty data.

## Output artifacts

- `data-dictionary.csv`: canonical fields and validation rules.
- `test-matrix.csv`: planned scenarios and evidence requirements.
- `records/`: append-only raw observation records.
- `audit-results.json`: machine-readable audit output.
