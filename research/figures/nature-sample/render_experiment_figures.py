from pathlib import Path
import json

import matplotlib as mpl

mpl.use("Agg")
mpl.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "font.size": 7.2,
        "axes.labelsize": 7.6,
        "axes.titlesize": 8.8,
        "xtick.labelsize": 6.8,
        "ytick.labelsize": 7.2,
        "svg.fonttype": "none",
        "pdf.fonttype": 42,
        "axes.linewidth": 0.55,
    }
)

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import ListedColormap
from matplotlib.lines import Line2D


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
record_paths = [ROOT / "experiments" / "records" / "readonly.jsonl", ROOT / "experiments" / "records" / "safety.jsonl"]
records = [json.loads(line) for path in record_paths for line in path.read_text().splitlines() if line.strip()]

scenario_labels = {
    "asset_resolution_ondo": "Asset resolution\nOndo",
    "asset_resolution_bstock": "Asset resolution\nbStocks",
    "market_context": "Market context",
    "quote_standard": "Standard quote",
    "quote_rfq": "RFQ quote",
    "allowance_read": "Allowance read",
    "simulation_preview": "Simulation preview",
    "defi_error_handling": "DeFi error handling",
    "retry_policy": "Retry policy",
}
scenario_order = list(scenario_labels)

# Figure A: empirical latency distribution.
fig, ax = plt.subplots(figsize=(7.2, 3.7), constrained_layout=True)
palette = ["#2E7088", "#6D83B8", "#8A6BA8", "#C87955", "#B44E54", "#4E8E86", "#D59C45", "#65717A", "#9D6B5A"]
for color, scenario in zip(palette, scenario_order):
    values = np.array(sorted(float(r["latency_ms"]) for r in records if r["scenario_id"] == scenario), dtype=float)
    if not len(values):
        continue
    ecdf = np.arange(1, len(values) + 1) / len(values)
    ax.step(values, ecdf, where="post", linewidth=1.35, color=color, label=scenario_labels[scenario].replace("\n", " "))
    ax.scatter(values[-1], ecdf[-1], s=11, color=color, zorder=3)
ax.set_title("Empirical latency distributions across Ariadne experiment scenarios", loc="left", pad=12, weight="bold")
ax.set_xlabel("Observed request latency (ms)")
ax.set_ylabel("Cumulative fraction of observations")
ax.set_xlim(left=0)
ax.set_ylim(0, 1.03)
ax.set_yticks([0, .25, .5, .75, 1.0])
ax.grid(axis="both", color="#D9DEE3", linewidth=0.45)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
legend_handles = [Line2D([], [], marker="o", linestyle="None", markersize=4.5, color=color, label=scenario_labels[scenario].replace("\n", " ")) for color, scenario in zip(palette, scenario_order)]
fig.legend(handles=legend_handles, loc="upper center", bbox_to_anchor=(0.5, 0.01), ncol=3, frameon=False, fontsize=6.2, handletextpad=0.3, columnspacing=1.0)
fig.savefig(OUT / "experiment-latency-ecdf.svg", bbox_inches="tight")
fig.savefig(OUT / "experiment-latency-ecdf.pdf", bbox_inches="tight")
fig.savefig(OUT / "experiment-latency-ecdf.png", dpi=600, bbox_inches="tight")
fig.savefig(OUT / "experiment-latency-ecdf.tiff", dpi=600, bbox_inches="tight")
plt.close(fig)

# Figure B: observed request classification by scenario.
decisions = ["success", "retryable_rate_limit", "upstream_error", "network_error", "http_error"]
decision_labels = ["Success", "Rate limit", "Upstream error", "Network error", "HTTP error"]
counts = np.zeros((len(scenario_order), len(decisions)), dtype=int)
for i, scenario in enumerate(scenario_order):
    for j, decision in enumerate(decisions):
        counts[i, j] = sum(r["scenario_id"] == scenario and r["response_class"] == decision for r in records)

fig, ax = plt.subplots(figsize=(7.2, 3.8), constrained_layout=True)
cmap = ListedColormap(["#F3F4F2", "#D6E6EA", "#8FB8C2", "#4E8E9A", "#2E7088"])
im = ax.imshow(counts, cmap=cmap, vmin=0, vmax=max(1, int(counts.max())), aspect="auto")
ax.set_xticks(range(len(decisions)), decision_labels)
ax.set_yticks(range(len(scenario_order)), [scenario_labels[s] for s in scenario_order])
ax.set_title("Observed response classifications across Ariadne experiment scenarios", loc="left", pad=12, weight="bold")
for i in range(counts.shape[0]):
    for j in range(counts.shape[1]):
        value = counts[i, j]
        if value:
            ax.text(j, i, str(value), ha="center", va="center", fontsize=7, color="white" if value > counts.max() / 2 else "#28343A", weight="bold")
ax.set_xticks([x - 0.5 for x in range(1, len(decisions))], minor=True)
ax.set_yticks([y - 0.5 for y in range(1, len(scenario_order))], minor=True)
ax.grid(which="minor", color="white", linewidth=1.0)
ax.tick_params(which="minor", bottom=False, left=False)
ax.spines[:].set_visible(False)
fig.savefig(OUT / "experiment-handling-heatmap.svg", bbox_inches="tight")
fig.savefig(OUT / "experiment-handling-heatmap.pdf", bbox_inches="tight")
fig.savefig(OUT / "experiment-handling-heatmap.png", dpi=600, bbox_inches="tight")
fig.savefig(OUT / "experiment-handling-heatmap.tiff", dpi=600, bbox_inches="tight")
plt.close(fig)
