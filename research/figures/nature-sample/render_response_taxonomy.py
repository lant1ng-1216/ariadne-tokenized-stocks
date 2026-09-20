from pathlib import Path

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
import pandas as pd


OUT = Path(__file__).resolve().parent
df = pd.read_csv(OUT / "response-taxonomy.csv")
decisions = ["retry", "return normalized data", "preserve error", "external signature", "block"]
colors = {
    "retry": "#E6A34A",
    "return normalized data": "#2E7088",
    "preserve error": "#8A6BA8",
    "external signature": "#7C65A8",
    "block": "#B44E54",
}
y = list(range(len(df) - 1, -1, -1))
x = [decisions.index(value) for value in df["decision"]]
sizes = [80 + 105 * count for count in df["evidence_count"]]

fig, ax = plt.subplots(figsize=(7.2, 3.35), constrained_layout=True)
ax.scatter(x, y, s=sizes, c=[colors[v] for v in df["decision"]], edgecolor="white", linewidth=0.9, zorder=3)

ax.set_xticks(range(len(decisions)), ["Retry", "Return\nnormalized", "Preserve\nerror", "External\nsignature", "Block"])
ax.set_yticks(y, df["observation"])
ax.set_xlim(-0.55, len(decisions) - 0.45)
ax.set_ylim(-0.75, len(df) - 0.25)
ax.set_title("Observed API responses map to explicit Ariadne handling decisions", loc="left", pad=12, weight="bold")
ax.set_ylabel("Observed response or boundary")
ax.grid(axis="y", color="#D9DEE3", linewidth=0.45)
ax.grid(axis="x", visible=False)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
fig.savefig(OUT / "response-taxonomy.svg", bbox_inches="tight")
fig.savefig(OUT / "response-taxonomy.pdf", bbox_inches="tight")
fig.savefig(OUT / "response-taxonomy.png", dpi=600, bbox_inches="tight")
fig.savefig(OUT / "response-taxonomy.tiff", dpi=600, bbox_inches="tight")
plt.close(fig)
