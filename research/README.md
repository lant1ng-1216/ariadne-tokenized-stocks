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

The figure-generation pipeline will be added after the data schema is reviewed against the existing test evidence.
