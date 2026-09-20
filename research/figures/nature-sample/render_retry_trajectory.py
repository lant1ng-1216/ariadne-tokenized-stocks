from pathlib import Path

import matplotlib as mpl

mpl.use("Agg")
mpl.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "font.size": 7.5,
        "axes.labelsize": 8,
        "axes.titlesize": 8.5,
        "xtick.labelsize": 7,
        "ytick.labelsize": 7,
        "svg.fonttype": "none",
        "pdf.fonttype": 42,
        "axes.linewidth": 0.6,
        "xtick.major.width": 0.5,
        "ytick.major.width": 0.5,
    }
)

import matplotlib.pyplot as plt
import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "retry-trajectory.csv"
OUT = Path(__file__).resolve().parent

df = pd.read_csv(DATA)
colors = {"retry": "#2F6F8F", "success": "#C45A4A"}

fig, ax = plt.subplots(figsize=(3.35, 2.45), constrained_layout=True)
ax.plot(
    df["attempt"],
    df["cumulative_elapsed_ms"],
    color="#2F6F8F",
    linewidth=1.25,
    zorder=2,
)

for _, row in df.iterrows():
    state = row["classification"]
    ax.scatter(
        row["attempt"],
        row["cumulative_elapsed_ms"],
        s=31,
        facecolor=colors[state],
        edgecolor="white",
        linewidth=0.75,
        zorder=3,
    )

ax.annotate(
    "42900 · retry",
    xy=(0, 0),
    xytext=(0.10, 52),
    textcoords="data",
    fontsize=7,
    color="#2F6F8F",
    arrowprops={"arrowstyle": "-", "color": "#2F6F8F", "lw": 0.7},
)
ax.annotate(
    "success",
    xy=(1, 127),
    xytext=(0.63, 112),
    fontsize=7,
    color="#C45A4A",
    arrowprops={"arrowstyle": "-", "color": "#C45A4A", "lw": 0.7},
)

ax.set_title("Ariadne reaches success after one rate-limit retry", loc="left", pad=8, weight="bold")
ax.set_xlabel("Request attempt")
ax.set_ylabel("Cumulative elapsed time (ms)")
ax.set_xticks([0, 1], ["Initial", "Retry"])
ax.set_xlim(-0.18, 1.18)
ax.set_ylim(-8, 145)
ax.grid(axis="y", color="#D9DEE3", linewidth=0.45)
ax.grid(axis="x", visible=False)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.text(
    0,
    -0.23,
    "One deterministic local trace; not a production-latency estimate.",
    transform=ax.transAxes,
    fontsize=6.2,
    color="#5C6670",
    va="top",
)

fig.savefig(OUT / "retry-trajectory.svg", bbox_inches="tight")
fig.savefig(OUT / "retry-trajectory.pdf", bbox_inches="tight")
fig.savefig(OUT / "retry-trajectory.png", dpi=600, bbox_inches="tight")
fig.savefig(OUT / "retry-trajectory.tiff", dpi=600, bbox_inches="tight")
plt.close(fig)
