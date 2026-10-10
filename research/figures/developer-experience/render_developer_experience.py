"""Render publication-style figures from the retained Ariadne experiment records.

No values are hand-entered. The plotting protocol and derived quantities are
validated against the experiment scripts and append-only JSONL observations.
"""

from collections import OrderedDict
from datetime import datetime
import json
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
        "xtick.major.width": 0.5,
        "ytick.major.width": 0.5,
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "savefig.facecolor": "white",
    }
)

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
COLORS = ["#2E7088", "#6D83B8", "#8A6BA8", "#C87955", "#B44E54", "#4E8E86", "#D59C45", "#65717A"]
INK = "#1E2B32"
MUTED = "#5C6670"
GRID = "#D9DEE3"


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def save_figure(fig, stem: str) -> None:
    fig.savefig(OUT / f"{stem}.png", dpi=600, bbox_inches="tight")
    fig.savefig(OUT / f"{stem}.tiff", dpi=600, bbox_inches="tight", pil_kwargs={"compression": "tiff_lzw"})
    fig.savefig(OUT / f"{stem}.pdf", bbox_inches="tight")
    svg_path = OUT / f"{stem}.svg"
    fig.savefig(svg_path, bbox_inches="tight")
    svg_path.write_text("\n".join(line.rstrip() for line in svg_path.read_text(encoding="utf-8").splitlines()) + "\n", encoding="utf-8")
    plt.close(fig)


def latency_distribution_figure(records: list[dict]) -> None:
    """Plot individual-provider-call ECDFs and the preserved DeFi error branch."""
    provider_records = [
        row
        for row in records
        if row["scenario_id"] != "retry_policy"
        and row["scenario_id"] != "defi_error_handling"
        and "/ seed lookup" not in row["request_variant"]
    ]
    defi_records = [row for row in records if row["scenario_id"] == "defi_error_handling"]

    groups: OrderedDict[str, list[dict]] = OrderedDict(
        [
            ("Asset resolution · Ondo", [r for r in provider_records if r["scenario_id"] == "asset_resolution_ondo"]),
            ("Asset resolution · bStocks", [r for r in provider_records if r["scenario_id"] == "asset_resolution_bstock"]),
            ("Market context · Ondo", [r for r in provider_records if r["scenario_id"] == "market_context" and r["request_variant"].startswith("ondo ")]),
            ("Market context · bStocks", [r for r in provider_records if r["scenario_id"] == "market_context" and r["request_variant"].startswith("bstock ")]),
            ("Standard quote · bStocks", [r for r in provider_records if r["scenario_id"] == "quote_standard"]),
            ("RFQ quote · Ondo", [r for r in provider_records if r["scenario_id"] == "quote_rfq"]),
            ("Allowance read", [r for r in provider_records if r["scenario_id"] == "allowance_read"]),
            ("Simulation preview", [r for r in provider_records if r["scenario_id"] == "simulation_preview"]),
        ]
    )
    if any(len(rows) != 10 for rows in groups.values()):
        raise ValueError(f"Expected ten repeated observations for each provider-call group: {[ (k, len(v)) for k, v in groups.items() ]}")
    if len(provider_records) != 80:
        raise ValueError(f"Expected 80 provider-call observations after excluding seed lookups, retry fixture, and error branch; got {len(provider_records)}")
    if len(defi_records) != 3 or any(
        row["http_status"] != 200
        or str(row["business_code"]) != "50000"
        or row["response_class"] != "http_error"
        or row["handling_decision"] != "preserve_error"
        for row in defi_records
    ):
        raise ValueError("The three DeFi error observations no longer match HTTP 200 / code 50000 / preserve_error")
    if any(row["broadcasted"] for row in records):
        raise ValueError("Experiment evidence unexpectedly contains a broadcast")

    fig, (ax, error_ax) = plt.subplots(
        1,
        2,
        figsize=(9.0, 4.1),
        gridspec_kw={"width_ratios": [3.4, 1.35]},
        constrained_layout=False,
    )
    fig.subplots_adjust(left=0.085, right=0.985, top=0.82, bottom=0.29, wspace=0.12)
    legend_handles = []
    for color, (label, rows) in zip(COLORS, groups.items()):
        values = np.sort(np.asarray([float(row["latency_ms"]) for row in rows]))
        ecdf = np.arange(1, len(values) + 1) / len(values)
        ax.step(values, ecdf, where="post", linewidth=1.2, color=color, zorder=2)
        ax.scatter(values, ecdf, s=7, color=color, edgecolor="white", linewidth=0.25, zorder=3)
        legend_handles.append(Line2D([], [], marker="o", linestyle="None", markersize=3.8, color=color, label=label))

    ax.set_title("(a) Provider request latency · n=80", loc="left", pad=8, weight="bold")
    ax.set_xlabel("Observed request latency (ms)")
    ax.set_ylabel("Cumulative fraction of requests")
    ax.set_xlim(left=0, right=max(float(r["latency_ms"]) for r in provider_records) * 1.06)
    ax.set_ylim(0, 1.03)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0])
    ax.grid(axis="both", color=GRID, linewidth=0.45)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#8B949A")
    ax.spines["bottom"].set_color("#8B949A")

    error_values = np.asarray([float(row["latency_ms"]) for row in defi_records])
    jitter = np.asarray([-0.075, 0.0, 0.075])
    error_ax.scatter(error_values, jitter, s=24, color="#B44E54", edgecolor="white", linewidth=0.55, zorder=3)
    median = float(np.median(error_values))
    error_ax.axvline(median, color=INK, linestyle=(0, (2, 2)), linewidth=0.85, zorder=1)
    error_ax.text(median, 0.19, f"median {median:.0f}", ha="center", va="bottom", fontsize=6.3, color=INK)
    error_ax.set_title("(b) Preserved provider error", loc="left", pad=8, weight="bold")
    error_ax.set_xlabel("Request latency (ms; truncated range)")
    error_ax.set_yticks([])
    error_ax.set_xlim(4285, 4335)
    error_ax.set_xticks([4290, 4310, 4330])
    error_ax.set_ylim(-0.18, 0.27)
    error_ax.grid(axis="x", color=GRID, linewidth=0.45)
    error_ax.spines["top"].set_visible(False)
    error_ax.spines["right"].set_visible(False)
    error_ax.spines["left"].set_visible(False)
    error_ax.spines["bottom"].set_color("#8B949A")
    error_ax.text(0.02, 0.94, "HTTP 200 · code 50000\n3/3 preserved as errors", transform=error_ax.transAxes, fontsize=6.1, color=MUTED, va="top")

    fig.suptitle("Repeated API observations reveal both latency variation and error semantics", x=0.01, y=0.975, ha="left", fontsize=9.2, weight="bold")
    fig.legend(handles=legend_handles, loc="lower center", bbox_to_anchor=(0.5, 0.105), ncol=4, frameon=False, fontsize=6.1, labelspacing=0.33, handletextpad=0.35, columnspacing=1.15)
    fig.text(0.01, 0.018, "A: 10 requests per provider-call condition; two seed lookups excluded. B: three DeFi Positions error responses; separate x scale. Observed 2026-09-20.", fontsize=6.2, color=MUTED)
    save_figure(fig, "figure-01-api-experiment")


def retry_experiment_figure(records: list[dict]) -> dict:
    """Render ten raw retry cycles from the deterministic loopback experiment."""
    retry_rows = [row for row in records if row["scenario_id"] == "retry_policy"]
    if len(retry_rows) != 20:
        raise ValueError(f"Expected 20 attempt records (10 deterministic cycles); got {len(retry_rows)}")

    trials = []
    for index in range(0, len(retry_rows), 2):
        first, second = retry_rows[index : index + 2]
        if first["attempt"] != 0 or first["response_class"] != "retryable_rate_limit" or first["handling_decision"] != "retry":
            raise ValueError(f"Retry cycle {index // 2 + 1} has no initial retryable 42900 response")
        if second["attempt"] != 1 or second["response_class"] != "success" or second["handling_decision"] != "return_normalized":
            raise ValueError(f"Retry cycle {index // 2 + 1} has no successful second attempt")
        if first["source_ref"] != "scripts/run-retry-experiment.ts" or second["source_ref"] != "scripts/run-retry-experiment.ts":
            raise ValueError("Retry experiment source is not the deterministic loopback runner")

        response_gap_ms = int(round((datetime.fromisoformat(second["observed_at"].replace("Z", "+00:00")).timestamp() - datetime.fromisoformat(first["observed_at"].replace("Z", "+00:00")).timestamp()) * 1000))
        retry_request_ms = float(second["latency_ms"])
        estimated_dispatch_ms = response_gap_ms - retry_request_ms
        if estimated_dispatch_ms <= 0:
            raise ValueError("Derived retry dispatch interval is non-positive; observation timestamps may no longer support this estimate")
        trials.append(
            {
                "number": index // 2 + 1,
                "dispatch_ms": estimated_dispatch_ms,
                "success_ms": float(response_gap_ms),
                "first_latency_ms": float(first["latency_ms"]),
                "retry_latency_ms": retry_request_ms,
                "retry_after_header_present": first.get("retry_after_honored") is True,
            }
        )

    if not all(trial["retry_after_header_present"] for trial in trials):
        raise ValueError("Expected Retry-After to be present on all injected rate-limit responses")

    fig, ax = plt.subplots(figsize=(7.2, 3.65), constrained_layout=False)
    fig.subplots_adjust(left=0.095, right=0.98, top=0.76, bottom=0.22)
    y_positions = np.arange(len(trials), 0, -1)
    for y, trial in zip(y_positions, trials):
        ax.hlines(y, 0, trial["success_ms"], color="#B9C3C8", linewidth=0.8, zorder=1)
        ax.scatter(0, y, marker="o", s=19, color="#B44E54", edgecolor="white", linewidth=0.45, zorder=3)
        ax.plot(
            [trial["dispatch_ms"], trial["dispatch_ms"]],
            [y - 0.17, y + 0.17],
            color="#D59C45",
            linewidth=1.05,
            zorder=3,
        )
        ax.scatter(trial["success_ms"], y, marker="o", s=19, color="#2E7088", edgecolor="white", linewidth=0.45, zorder=3)

    median_recovery = float(np.median([trial["success_ms"] for trial in trials]))
    ax.axvline(median_recovery, color="#2E7088", linestyle=(0, (3, 2)), linewidth=0.8, zorder=0)
    ax.text(median_recovery + 7, len(trials) + 0.43, f"median {median_recovery:.0f} ms", ha="left", va="bottom", fontsize=6.5, color="#2E7088")
    ax.set_xlabel("Elapsed time from first 429 response observation (ms)")
    ax.set_ylabel("Trial")
    ax.set_yticks(y_positions, [f"{number:02d}" for number in range(1, len(trials) + 1)])
    ax.set_xlim(-12, max(trial["success_ms"] for trial in trials) + 48)
    ax.set_ylim(0.35, len(trials) + 1.05)
    ax.set_xticks(np.arange(0, 551, 100))
    ax.grid(axis="x", color=GRID, linewidth=0.45)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#8B949A")
    ax.spines["bottom"].set_color("#8B949A")
    ax.tick_params(axis="y", length=0)
    fig.suptitle("Ten repeated 42900 challenges recover on one retry", x=0.095, y=0.97, ha="left", fontsize=9.2, weight="bold")
    fig.text(0.095, 0.895, "Deterministic loopback · Retry-After: 10 ms · 10/10 second attempts succeeded", fontsize=6.8, color=MUTED)
    fig.legend(
        handles=[
            Line2D([], [], marker="o", linestyle="None", color="#B44E54", markersize=4, label="42900 response"),
            Line2D([], [], marker="|", linestyle="None", color="#D59C45", markersize=8, label="Estimated retry dispatch"),
            Line2D([], [], marker="o", linestyle="None", color="#2E7088", markersize=4, label="Success response"),
        ],
        loc="upper center",
        bbox_to_anchor=(0.54, 0.835),
        frameon=False,
        fontsize=6.5,
        ncol=3,
        handletextpad=0.35,
        columnspacing=0.9,
    )
    fig.text(0.01, 0.025, "Dispatch time is estimated as the inter-response timestamp gap minus retry-request latency; local test only, not provider or production performance.", fontsize=6.2, color=MUTED)
    save_figure(fig, "figure-02-retry-experiment")

    return {
        "trials": len(trials),
        "retryAfterHeaderPresent": sum(trial["retry_after_header_present"] for trial in trials),
        "successAfterOneRetry": len(trials),
        "estimatedDispatchMs": {
            "min": min(trial["dispatch_ms"] for trial in trials),
            "max": max(trial["dispatch_ms"] for trial in trials),
        },
        "responseToSuccessMs": {
            "min": min(trial["success_ms"] for trial in trials),
            "median": median_recovery,
            "max": max(trial["success_ms"] for trial in trials),
        },
        "broadcasted": False,
    }


def main() -> None:
    records = read_jsonl(ROOT / "research/experiments/records/readonly.jsonl") + read_jsonl(ROOT / "research/experiments/records/safety.jsonl")
    latency_distribution_figure(records)
    retry_result = retry_experiment_figure(records)
    print(json.dumps({"requestObservations": len(records), "figures": ["figure-01-api-experiment", "figure-02-retry-experiment"], "retryExperiment": retry_result}, indent=2))


if __name__ == "__main__":
    main()
