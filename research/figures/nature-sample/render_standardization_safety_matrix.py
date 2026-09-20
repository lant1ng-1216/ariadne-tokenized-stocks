from pathlib import Path

import matplotlib as mpl

mpl.use("Agg")
mpl.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "font.size": 7.2,
        "axes.labelsize": 7.5,
        "axes.titlesize": 8.5,
        "xtick.labelsize": 6.8,
        "ytick.labelsize": 7.2,
        "svg.fonttype": "none",
        "pdf.fonttype": 42,
        "axes.linewidth": 0.55,
    }
)

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.colors import ListedColormap
from matplotlib.patches import Patch


OUT = Path(__file__).resolve().parent
data = pd.read_csv(OUT / "standardization-safety-matrix.csv")
columns = [
    "asset_identity",
    "market_context",
    "quote",
    "allowance",
    "simulation",
    "execution_boundary",
]
labels = [
    "Asset\nidentity",
    "Market\ncontext",
    "Quote",
    "Allowance",
    "Simulation",
    "Execution\nboundary",
]
state_order = ["not_measured", "not_applicable", "verified", "warning", "external_boundary", "blocked"]
state_label = {
    "not_measured": "Not measured",
    "not_applicable": "Not applicable",
    "verified": "Verified",
    "warning": "Warning / limitation",
    "external_boundary": "External boundary",
    "blocked": "Blocked",
}
state_value = {state: i for i, state in enumerate(state_order)}
matrix = (
    data[columns]
    .replace({"external_signature": "external_boundary"})
    .replace(state_value)
    .astype(float)
    .to_numpy()
)

fig, ax = plt.subplots(figsize=(7.2, 3.25), constrained_layout=True)
cmap = ListedColormap(["#F3F4F2", "#D7DEE3", "#2E7088", "#E6A34A", "#8A6BA8", "#B44E54"])
im = ax.imshow(matrix, cmap=cmap, vmin=-0.5, vmax=len(state_order) - 0.5, aspect="auto")

ax.set_xticks(range(len(columns)), labels)
ax.set_yticks(range(len(data)), data["case"])
ax.tick_params(length=0, pad=4)
ax.set_title(
    "Ariadne converts heterogeneous API evidence into explicit execution states",
    loc="left",
    pad=12,
    weight="bold",
)

for row in range(matrix.shape[0]):
    for col in range(matrix.shape[1]):
        state = data.iloc[row][columns[col]]
        state = "external_boundary" if state == "external_signature" else state
        text = {
            "not_measured": "—",
            "not_applicable": "N/A",
            "verified": "V",
            "warning": "!",
            "external_boundary": "E",
            "blocked": "×",
        }[state]
        color = "#4E585F" if state == "not_measured" else "white"
        ax.text(col, row, text, ha="center", va="center", fontsize=10, color=color, weight="bold")

for spine in ax.spines.values():
    spine.set_visible(False)
ax.set_xticks([x - 0.5 for x in range(1, len(columns))], minor=True)
ax.set_yticks([y - 0.5 for y in range(1, len(data))], minor=True)
ax.grid(which="minor", color="white", linewidth=1.0)
ax.tick_params(which="minor", bottom=False, left=False)

legend = [Patch(facecolor=cmap(i), edgecolor="none", label=state_label[state]) for i, state in enumerate(state_order)]
ax.legend(
    handles=legend,
    ncol=5,
    loc="upper left",
    bbox_to_anchor=(0, -0.16),
    frameon=False,
    fontsize=6.6,
    handlelength=1.0,
    columnspacing=1.0,
)
fig.text(
    0.01,
    -0.01,
    "Cells summarize observed evidence, not population statistics. Sources: API observations, domain tests, and deterministic retry test.",
    fontsize=6.2,
    color="#5C6670",
)

fig.savefig(OUT / "standardization-safety-matrix.svg", bbox_inches="tight")
fig.savefig(OUT / "standardization-safety-matrix.pdf", bbox_inches="tight")
fig.savefig(OUT / "standardization-safety-matrix.png", dpi=600, bbox_inches="tight")
fig.savefig(OUT / "standardization-safety-matrix.tiff", dpi=600, bbox_inches="tight")
plt.close(fig)
