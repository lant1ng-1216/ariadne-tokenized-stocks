"""Render the first visual-review sample from measured retry evidence only."""
from pathlib import Path
import json
import matplotlib.pyplot as plt
import scienceplots

ROOT = Path(__file__).resolve().parents[1]
trace = json.loads((ROOT / "research/data/request-traces.json").read_text())["traces"][0]
out = ROOT / "research/figures/sample"
out.mkdir(parents=True, exist_ok=True)

plt.style.use(["science", "no-latex"])
plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 9,
    "axes.linewidth": 0.8,
    "axes.edgecolor": "#52636b",
    "xtick.color": "#52636b",
    "ytick.color": "#52636b",
    "savefig.bbox": "tight",
    "savefig.dpi": 300,
})

fig, ax = plt.subplots(figsize=(6.8, 3.8))
x = [0, 1]
y = [0, trace["elapsedMs"]]
ax.plot(x, y, color="#176b87", linewidth=1.8, marker="o", markersize=7, markerfacecolor="white", markeredgewidth=1.8, markeredgecolor="#176b87", zorder=3)
ax.scatter([0], [0], s=65, color="#c97927", zorder=4, label="42900 / retry")
ax.scatter([1], [trace["elapsedMs"]], s=65, color="#176b87", zorder=4, label="success")
ax.annotate("42900\nRetry-After honored", xy=(0, 0), xytext=(0.18, 28), textcoords="data", arrowprops={"arrowstyle": "-", "color": "#c97927", "lw": 0.9}, color="#8a5a20", ha="left", va="bottom")
ax.annotate(f"success\n{trace['elapsedMs']} ms total", xy=(1, trace["elapsedMs"]), xytext=(0.78, trace["elapsedMs"]-28), textcoords="data", arrowprops={"arrowstyle": "-", "color": "#176b87", "lw": 0.9}, color="#176b87", ha="right", va="top")
ax.set_title("Retry trajectory under a rate-limit response", loc="left", color="#24313a", fontweight="bold", pad=12)
ax.set_xlabel("Request attempt")
ax.set_ylabel("Cumulative elapsed time (ms)")
ax.set_xticks([0, 1], ["Attempt 0", "Attempt 1"])
ax.set_xlim(-0.25, 1.25)
ax.set_ylim(-8, trace["elapsedMs"] * 1.18)
ax.grid(axis="y", color="#d7e0e3", linewidth=0.6)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.legend(loc="upper left", frameon=False, fontsize=8)
fig.text(0.01, -0.02, "Deterministic local test; n = 1 trace, 2 attempts. Source: research/data/request-traces.json.", ha="left", va="top", fontsize=7, color="#60727c")
for ext in ("svg", "pdf", "png"):
    fig.savefig(out / f"api-retry-trajectory.{ext}")
plt.close(fig)
print(out / "api-retry-trajectory.svg")
