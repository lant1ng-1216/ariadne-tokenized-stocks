# Figure Contract — Deterministic Retry Trajectory

## Core conclusion

Ariadne retries one rate-limited read exactly once, honors the retry path, and reaches a successful response after 127 ms in the deterministic local test.

## Evidence chain

- Source: `research/data/retry-trajectory.csv`
- X axis: request attempt index (0 = initial request)
- Y axis: cumulative elapsed time (ms)
- State encoding: response code and classification labels
- Observation unit: one deterministic test trace; this is not a population estimate

## Figure archetype

Quantitative trace with an explicit state transition annotation. No uncertainty band is shown because the source contains one deterministic trace and no replicate measurements.

## Export contract

Editable SVG and PDF with embedded text; 600 dpi PNG for raster review. Typography and axes remain publication-oriented and legible at single-column width.

## Limitations

The measurement comes from a local deterministic test server and should not be interpreted as production latency or a statistical performance estimate.
