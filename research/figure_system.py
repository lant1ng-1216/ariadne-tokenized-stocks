"""Build individual, reproducible research figures from evidence data.

The source-data/recipe/output contract is intentionally simple: each figure is
one question, one recipe, and one set of SVG/PDF/PNG outputs.
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import scienceplots

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "research" / "data"
OUT = ROOT / "research" / "figures" / "rendered"
OUT.mkdir(parents=True, exist_ok=True)

BLUE, AMBER, RED, INK, MUTED, GRID = "#176b87", "#c97927", "#b64b4b", "#24313a", "#60727c", "#d7e0e3"


def load(name: str):
    return json.loads((DATA / name).read_text())


def style():
    plt.style.use(["science", "no-latex"])
    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "font.size": 8.5,
        "axes.titlesize": 10,
        "axes.labelsize": 8.5,
        "axes.linewidth": 0.8,
        "axes.edgecolor": MUTED,
        "axes.labelcolor": INK,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "xtick.major.size": 3,
        "ytick.major.size": 3,
        "legend.frameon": False,
        "figure.facecolor": "white",
        "savefig.facecolor": "white",
        "savefig.bbox": "tight",
        "savefig.dpi": 300,
    })


def save(fig, stem):
    for ext in ("svg", "pdf", "png"):
        fig.savefig(OUT / f"{stem}.{ext}")
    plt.close(fig)


def node(ax, xy, text, detail="", color=GRID, edge=MUTED):
    x, y = xy
    patch = FancyBboxPatch((x - 0.11, y - 0.055), 0.22, 0.11, boxstyle="round,pad=0.008,rounding_size=0.008", facecolor=color, edgecolor=edge, linewidth=0.8, transform=ax.transAxes)
    ax.add_patch(patch)
    ax.text(x, y + 0.008, text, ha="center", va="center", transform=ax.transAxes, color=INK, fontsize=8)
    if detail: ax.text(x, y - 0.027, detail, ha="center", va="center", transform=ax.transAxes, color=MUTED, fontsize=6.5)


def link(ax, a, b, color=MUTED):
    ax.add_patch(FancyArrowPatch(a, b, transform=ax.transAxes, arrowstyle="-|>", mutation_scale=8, linewidth=0.9, color=color, connectionstyle="arc3,rad=0"))


def architecture():
    fig, ax = plt.subplots(figsize=(7.1, 3.6)); ax.axis("off")
    ax.set_title("Ariadne system architecture", loc="left", color=INK, pad=12, fontweight="bold")
    node(ax, (0.14, .68), "Existing agent", "application / agent", "#f4f7f8")
    node(ax, (0.36, .68), "MCP interface", "12 structured tools", "#e7f2f5", BLUE)
    node(ax, (0.58, .68), "TypeScript SDK", "domain services", "#f4f7f8")
    node(ax, (0.80, .68), "Binance Web3 API", "read / prepare", "#f4f7f8")
    link(ax, (.25,.68),(.30,.68)); link(ax,(.47,.68),(.52,.68)); link(ax,(.69,.68),(.74,.68))
    node(ax, (.36, .34), "Normalization", "identity / prices", "#f4f7f8")
    node(ax, (.62, .34), "Safety policy", "allowance / slippage", "#fff4e7", AMBER)
    link(ax,(.58,.625),(.40,.40)); link(ax,(.58,.625),(.60,.40))
    node(ax, (.18, .12), "External wallet", "private key stays outside", "#f4f7f8")
    node(ax, (.78, .12), "Signed side effect", "explicit user authorization", "#fff0f0", RED)
    link(ax,(.62,.285),(.73,.16)); link(ax,(.29,.12),(.68,.12))
    ax.text(.5, .02, "Interpretation and safety remain in Ariadne; signing authority remains with the user wallet.", ha="center", transform=ax.transAxes, color=MUTED, fontsize=7)
    save(fig, "figure-01-system-architecture")


def workflow():
    fig, ax = plt.subplots(figsize=(7.1, 2.65)); ax.set_xlim(-.5, 6.5); ax.set_ylim(-.45, .8); ax.axis("off")
    ax.set_title("Progressive commitment from discovery to execution", loc="left", color=INK, pad=12, fontweight="bold")
    steps=[("Resolve","read-only",BLUE),("Context","read-only",BLUE),("Plan","no side effect",BLUE),("Simulate","no broadcast",BLUE),("Confirm","user decision",AMBER),("Sign","external wallet",AMBER),("Broadcast","real side effect",RED)]
    for i,(label,detail,color) in enumerate(steps):
        ax.scatter(i, .25, s=550, color="white", edgecolor=color, linewidth=1.5, zorder=3); ax.text(i,.28,label,ha="center",fontsize=7); ax.text(i,.08,detail,ha="center",fontsize=6,color=MUTED)
        if i<6: ax.annotate("",(i+.82,.25),(i+.18,.25),arrowprops={"arrowstyle":"->","color":MUTED,"lw":.8})
    ax.plot([0,6],[ -.12,-.12], color=GRID, lw=1); ax.text(0,-.28,"lower commitment",ha="center",fontsize=7,color=MUTED); ax.text(6,-.28,"higher commitment",ha="center",fontsize=7,color=MUTED)
    save(fig, "figure-02-progressive-commitment")


def action_plan():
    fig, ax = plt.subplots(figsize=(7.1, 3.0)); ax.axis("off"); ax.set_title("ActionPlan state machine", loc="left", color=INK, pad=12, fontweight="bold")
    points={"draft":(.10,.58),"simulated":(.30,.58),"confirmed":(.50,.58),"signing_required":(.72,.58),"submitted":(.72,.28),"completed":(.72,.06)}
    for name,(x,y) in points.items(): node(ax,(x,y),name,"state", "#fff" if name not in ("completed",) else "#e7f2f5", BLUE if name=="completed" else MUTED)
    for a,b in [("draft","simulated"),("simulated","confirmed"),("confirmed","signing_required"),("signing_required","submitted"),("submitted","completed")]: link(ax,points[a],points[b])
    node(ax,(.18,.18),"failed","unsafe / invalid","#fff0f0",RED); node(ax,(.38,.18),"expired","deadline passed","#fff4e7",AMBER); link(ax,(.10,.52),(.18,.24),RED); link(ax,(.50,.52),(.38,.24),AMBER)
    save(fig, "figure-03-actionplan-state-machine")


def capability_matrix():
    caps=load("capability-matrix.json")["capabilities"]; fig,ax=plt.subplots(figsize=(7.1,4.4)); ax.set_title("Capability evidence map",loc="left",color=INK,pad=12,fontweight="bold")
    statuses=[("verified",BLUE),("partial",AMBER),("blocked",RED),("deferred",MUTED)]; x={s:i for i,(s,_) in enumerate(statuses)}
    for y,item in enumerate(caps):
        ax.text(-.1,y,item["category"],ha="right",va="center",fontsize=7,color=INK); ax.scatter(x[item["status"]],y,s=55,color=dict(statuses)[item["status"]],zorder=3)
    ax.set_xticks(range(4),[s.title() for s,_ in statuses],fontsize=7); ax.set_yticks([]); ax.set_xlim(-1.5,3.5); ax.set_ylim(-1,len(caps)); ax.grid(axis="x",color=GRID,lw=.6); ax.spines[["top","right","left"]].set_visible(False); ax.set_xlabel("Evidence status",color=MUTED)
    save(fig,"figure-04-capability-evidence-map")


def error_taxonomy():
    fig,axs=plt.subplots(1,2,figsize=(7.1,2.9),gridspec_kw={"width_ratios":[1.15,1]}); fig.suptitle("API behavior and failure taxonomy",x=.02,ha="left",color=INK,fontweight="bold")
    labels=["HTTP 200 / code 0","HTTP 200 / code 50000","42900","HTTP 5xx"]; vals=["success","upstream error","rate limit","server failure"]; colors=[BLUE,RED,AMBER,AMBER]
    for i,(l,v,c) in enumerate(zip(labels,vals,colors)): axs[0].plot([0,1],[i,i],color=GRID,lw=5); axs[0].scatter(0,i,color=c,s=45); axs[0].text(.08,i,l,va="center",fontsize=7); axs[0].text(.98,i,v,ha="right",va="center",fontsize=7,color=c)
    axs[0].set_xlim(-.1,1.05); axs[0].set_ylim(-1,4); axs[0].axis("off"); axs[0].set_title("Response classification",fontsize=9,loc="left")
    variants=["variant 1","variant 2","variant 3"]; axs[1].scatter([1,1,1],[2,1,0],s=70,color=RED); axs[1].set_yticks([0,1,2],variants,fontsize=7); axs[1].set_xticks([0,1], ["HTTP 200","code 50000"],fontsize=7); axs[1].set_xlim(-.4,1.4); axs[1].set_ylim(-.6,2.6); axs[1].grid(axis="x",color=GRID,lw=.6); axs[1].spines[["top","right"]].set_visible(False); axs[1].set_title("DeFi Positions variants",fontsize=9,loc="left"); axs[1].text(1,-.45,"4 / 5 quota remaining",ha="center",fontsize=6,color=MUTED)
    save(fig,"figure-05-api-failure-taxonomy")


def observability():
    trace=load("request-traces.json")["traces"][0]
    fig,axs=plt.subplots(1,2,figsize=(7.1,2.8),gridspec_kw={"width_ratios":[1.35,1]}); fig.suptitle("Request observability trace",x=.02,ha="left",color=INK,fontweight="bold")
    ax=axs[0]; ax.set_xlim(0,5); ax.set_ylim(-.3,1.2); ax.axis("off")
    labels=["request","attempt","response","classification","retry / return","structured result"]
    for i,label in enumerate(labels): ax.scatter(i,.55,s=180,color=BLUE if i in (0,1,5) else AMBER,zorder=3); ax.text(i,.27,label.replace(" / "," /\n"),ha="center",fontsize=5.8); i<5 and ax.annotate("",(i+.82,.55),(i+.18,.55),arrowprops={"arrowstyle":"->","color":MUTED,"lw":.8})
    fields=["durationMs","attempt","status","code","rateLimitHeaders","success"]
    for i,f in enumerate(fields): ax.text(i*.98,.92,f,ha="center",fontsize=5.5,color=MUTED,rotation=35 if i==4 else 0)
    ax=axs[1]
    ax.plot([0,1],[0,trace["elapsedMs"]],color=BLUE,lw=1.4,marker="o",ms=5)
    ax.axhline(trace["elapsedMs"],color=GRID,lw=.8)
    ax.set_xticks([0,1],["attempt 0","attempt 1"],fontsize=7); ax.set_ylabel("Cumulative time (ms)",fontsize=7); ax.set_title("Deterministic retry evidence",fontsize=9,loc="left")
    ax.text(1,trace["elapsedMs"]+5,f'{trace["elapsedMs"]} ms total',ha="right",fontsize=7,color=BLUE); ax.set_ylim(0,trace["elapsedMs"]*1.22); ax.spines[["top","right"]].set_visible(False); ax.grid(axis="y",color=GRID,lw=.6)
    save(fig,"figure-06-observability-trace")


if __name__ == "__main__":
    style(); architecture(); workflow(); action_plan(); capability_matrix(); error_taxonomy(); observability(); print("Rendered six independent figures")
