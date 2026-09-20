from pathlib import Path

import matplotlib as mpl

mpl.use("Agg")
mpl.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "font.size": 7.2,
        "svg.fonttype": "none",
        "pdf.fonttype": 42,
        "axes.linewidth": 0.55,
    }
)

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch


OUT = Path(__file__).resolve().parent
fig, ax = plt.subplots(figsize=(7.2, 3.4), constrained_layout=True)
ax.set_xlim(0, 10)
ax.set_ylim(0, 5.4)
ax.axis("off")

BLUE = "#2E7088"
PURPLE = "#8A6BA8"
AMBER = "#E6A34A"
RED = "#B44E54"
INK = "#1F252A"
MUTED = "#5C6670"
PALE = "#F3F4F2"


def node(x, y, title, subtitle, color, width=1.55):
    box = FancyBboxPatch(
        (x, y), width, 0.72,
        boxstyle="round,pad=0.025,rounding_size=0.08",
        facecolor=PALE if color == PALE else color,
        edgecolor=color if color != PALE else "#B8C0C5",
        linewidth=1.0,
    )
    ax.add_patch(box)
    text_color = INK if color == PALE else "white"
    ax.text(x + width / 2, y + 0.46, title, ha="center", va="center", fontsize=7.3, weight="bold", color=text_color)
    ax.text(x + width / 2, y + 0.21, subtitle, ha="center", va="center", fontsize=6.2, color=text_color)


def arrow(x1, y1, x2, y2, color=BLUE, style="-"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=9, linewidth=1.0, color=color, linestyle=style))


node(0.25, 3.8, "Resolve asset", "identity + chain", BLUE)
node(2.1, 3.8, "Read market", "status + prices", BLUE)
node(3.95, 3.8, "Build quote", "route + expiry", BLUE)
node(5.8, 3.8, "Check safety", "allowance + limits", AMBER)
node(7.65, 3.8, "Simulate", "no broadcast", BLUE)
node(7.65, 2.0, "User confirmation", "explicit action", PURPLE)
node(7.65, 0.55, "External signer", "EIP-712 / wallet", PURPLE)
node(5.8, 1.95, "Blocked", "retain reason", RED)

arrow(1.8, 4.16, 2.05, 4.16)
arrow(3.65, 4.16, 3.9, 4.16)
arrow(5.5, 4.16, 5.75, 4.16)
arrow(7.35, 4.16, 7.6, 4.16)
arrow(8.42, 3.8, 8.42, 2.77, PURPLE)
arrow(8.42, 1.95, 8.42, 1.32, PURPLE)
arrow(6.55, 3.8, 6.55, 2.72, RED)

ax.text(6.72, 3.05, "failed gate", fontsize=6.3, color=RED, va="center")
ax.text(8.62, 3.18, "passes", fontsize=6.3, color=PURPLE, va="center")
ax.text(8.62, 1.62, "signature remains external", fontsize=6.3, color=PURPLE, va="center")

ax.text(0.25, 5.1, "Ariadne separates interpretation, safety, and side effects before execution", fontsize=9.3, weight="bold", color=INK)
ax.text(0.25, 4.78, "Verified control path derived from the SDK action-plan and safety-policy states.", fontsize=6.8, color=MUTED)
ax.text(0.25, 0.03, "The signer and private key remain outside Ariadne; blocked plans preserve an explicit reason.", fontsize=6.2, color=MUTED)

fig.savefig(OUT / "safety-gate-schematic.svg", bbox_inches="tight")
fig.savefig(OUT / "safety-gate-schematic.pdf", bbox_inches="tight")
fig.savefig(OUT / "safety-gate-schematic.png", dpi=600, bbox_inches="tight")
fig.savefig(OUT / "safety-gate-schematic.tiff", dpi=600, bbox_inches="tight")
plt.close(fig)
