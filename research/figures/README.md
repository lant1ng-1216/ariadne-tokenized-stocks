# Figure generation

Run from the repository root:

```bash
python3 research/figure_system.py
```

The script reads evidence files under `research/data/` and writes each independent figure as SVG, PDF and PNG to `research/figures/rendered/`. Each figure has a separate recipe under `research/recipes/`.

- `figure-01-system-architecture.*`
- `figure-02-progressive-commitment.*`
- `figure-03-actionplan-state-machine.*`
- `figure-04-capability-evidence-map.*`
- `figure-05-api-failure-taxonomy.*`
- `figure-06-observability-trace.*`

Figures are evidence views, not decorative illustrations. Do not change a plotted value manually; update the source evidence file and regenerate.
