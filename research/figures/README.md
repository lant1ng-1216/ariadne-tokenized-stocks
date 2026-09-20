# Figure generation

Run from the repository root:

```bash
python3 research/figures/nature-sample/render_experiment_figures.py
```

The script reads the append-only experiment records under `research/experiments/records/` and writes each figure as editable SVG/PDF plus 600 dpi PNG/TIFF to this directory.

- `experiment-latency-ecdf.*`
- `experiment-handling-heatmap.*`

Figures are evidence views, not decorative illustrations. Do not change a plotted value manually; update the source records and regenerate.
