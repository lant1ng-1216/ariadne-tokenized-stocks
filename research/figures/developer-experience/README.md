# Developer-experience figures

Publication figures are regenerated from committed, dated request-level experiment records. The plotting script validates the denominators, scenario labels, and retry response sequence before rendering; it does not hand-enter plotted values.

## Regenerate

```bash
python3 -m pip install -r research/figures/developer-experience/requirements.txt
python3 research/figures/developer-experience/render_developer_experience.py
```

The script reads:

- `research/experiments/records/readonly.jsonl` for asset resolution, market-context, DeFi error, and retry observations;
- `research/experiments/records/safety.jsonl` for quote, allowance, simulation, and deterministic loopback retry observations.

Figure 1 renders 80 provider calls across eight conditions as empirical CDFs, with ten observations per condition. It excludes two seed lookups and places three DeFi Positions provider-error responses in a separate panel with its own truncated x-axis. Figure 2 reconstructs ten sequential loopback retry cycles from paired attempt records. The retry-dispatch marker is derived from successive response timestamps minus the retry request latency; it is not an independently timed event.

Each figure is exported as 600 dpi PNG/TIFF and editable PDF/SVG. Typography, restrained color, panel annotation, and explicit axes follow the in-repository examples in `research/figures/nature-sample/` and the linked figures4papers figure-making guide.

These are bounded development experiments. Provider-call timings are not a production SLO. The retry server is deterministic and local; neither figure estimates production reliability or user-experienced end-to-end latency.
