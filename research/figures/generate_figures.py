"""Generate editable, dependency-free research figures as SVG files."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "research" / "data"
OUT = ROOT / "research" / "figures" / "generated"
OUT.mkdir(parents=True, exist_ok=True)
INK, MUTED, LINE = "#24313a", "#60727c", "#a9b7bd"
BLUE, AMBER, RED, GRAY = "#176b87", "#c97927", "#b64b4b", "#e8edef"

def evidence(name): return json.loads((DATA / name).read_text())
def esc(v): return str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
def canvas(title, description, width=1200, height=680):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">', f'<title id="title">{esc(title)}</title><desc id="desc">{esc(description)}</desc>', '<style>text{font-family:Arial,Helvetica,sans-serif;fill:#24313a}.title{font-size:24px;font-weight:600}.panel{font-size:18px;font-weight:600}.body{font-size:15px}.small{font-size:13px;fill:#60727c}.axis{stroke:#60727c;stroke-width:1.5}.hair{stroke:#a9b7bd;stroke-width:1}.arrow{fill:none;stroke:#60727c;stroke-width:2;marker-end:url(#arrow)}</style>', '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#60727c"/></marker></defs>', f'<text x="48" y="42" class="title">{esc(title)}</text>']
def box(p,x,y,w,h,label,detail="",fill="#ffffff",stroke=LINE):
    p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'); p.append(f'<text x="{x+w/2}" y="{y+31}" class="body" text-anchor="middle">{esc(label)}</text>')
    if detail: p.append(f'<text x="{x+w/2}" y="{y+56}" class="small" text-anchor="middle">{esc(detail)}</text>')
def arrow(p,x1,y1,x2,y2): p.append(f'<path d="M{x1},{y1} L{x2},{y2}" class="arrow"/>')
def save(name,p): p.append('</svg>'); (OUT/name).write_text("\n".join(p))

def architecture():
    p=canvas("Figure 1 | Ariadne system architecture","Layered architecture and external wallet boundary."); p.append('<text x="48" y="86" class="panel">(a) Layered capability path</text>')
    for x,l,d,f,s in [(90,"Existing Agent","Codex, Claude Code or app","#fff",LINE),(410,"Ariadne MCP","12 structured tools","#eef5f7",BLUE),(730,"Ariadne SDK","domain services","#fff",LINE)]: box(p,x,125,230,72,l,d,f,s)
    arrow(p,320,161,400,161); arrow(p,640,161,720,161); box(p,250,285,250,76,"Normalization","identity, prices, decimals"); box(p,700,285,250,76,"Safety policy","allowance, slippage, impact","#fff6eb",AMBER); arrow(p,845,197,375,275); arrow(p,845,197,825,275); box(p,430,455,280,76,"Binance Web3 API","read and prepare operations"); arrow(p,500,361,540,445); arrow(p,825,361,610,445); box(p,88,560,270,70,"External wallet signer","private key stays outside","#f3f4f5",MUTED); box(p,850,560,270,70,"Signed order / transaction","explicit side effect","#fff0f0",RED); arrow(p,710,493,850,585); arrow(p,358,595,840,595); p.append('<text x="48" y="664" class="small">Ariadne controls interpretation, planning and safety; the user wallet controls signing authority.</text>'); save("figure-01-system-architecture.svg",p)

def workflow():
    p=canvas("Figure 2 | Progressive commitment workflow","Read-only discovery progresses to explicit user-controlled signing and broadcast."); p.append('<text x="48" y="86" class="panel">(a) Permission and side-effect progression</text>')
    steps=[("Resolve","read-only",BLUE),("Context","read-only",BLUE),("Plan","no side effect",BLUE),("Simulate","no broadcast",BLUE),("Confirm","user decision",AMBER),("Sign","external wallet",AMBER),("Broadcast","real side effect",RED)]; x=58
    for i,(l,d,c) in enumerate(steps): box(p,x,180,135,82,l,d,"#fff",c); (i<len(steps)-1) and arrow(p,x+137,221,x+157,221); x+=164
    p.append('<line x1="58" y1="340" x2="1142" y2="340" class="axis"/><text x="58" y="375" class="small">Lower commitment</text><text x="1142" y="375" class="small" text-anchor="end">Higher commitment</text>'); p.append('<circle cx="235" cy="340" r="7" fill="#176b87"/><circle cx="562" cy="340" r="7" fill="#c97927"/><circle cx="1060" cy="340" r="7" fill="#b64b4b"/>'); p.append('<text x="48" y="458" class="panel">(b) Boundary conditions</text>')
    rows=[("Automatic retry","Read and prepare operations","Allowed by policy"),("Automatic retry","Broadcast operation","Not allowed"),("Private key access","Ariadne SDK","Never"),("User confirmation","Confirmed ActionPlan","Required")]
    for i,row in enumerate(rows):
        y=505+i*34; p.append(f'<line x1="60" y1="{y+12}" x2="1140" y2="{y+12}" class="hair"/>'); [p.append(f'<text x="{60+j*360}" y="{y}" class="body">{esc(v)}</text>') for j,v in enumerate(row)]
    save("figure-02-progressive-commitment.svg",p)

def action_plan():
    p=canvas("Figure 3 | ActionPlan state machine","Explicit states and failure paths separating simulation, confirmation, signing and broadcast."); p.append('<text x="48" y="86" class="panel">(a) State transitions</text>'); coords={"draft":(100,180),"simulated":(350,180),"confirmed":(600,180),"signing_required":(850,180),"submitted":(850,370),"completed":(850,540)}
    for l,(x,y) in coords.items(): box(p,x,y,190,70,l,"state")
    for a,b in [("draft","simulated"),("simulated","confirmed"),("confirmed","signing_required"),("signing_required","submitted"),("submitted","completed")]:
        x1,y1=coords[a]; x2,y2=coords[b]; arrow(p,x1+190 if x1<x2 else x1+95,y1+35,x2 if x1<x2 else x2+95,y2 if y1!=y2 else y2+35)
    box(p,100,410,190,70,"failed","unsafe or invalid","#fff0f0",RED); box(p,350,410,190,70,"expired","deadline passed","#fff6eb",AMBER); arrow(p,195,250,195,400); arrow(p,695,250,445,400); arrow(p,945,250,195,400); p.append('<text x="48" y="640" class="small">A failed or expired plan cannot be broadcast without creating a new valid plan.</text>'); save("figure-03-actionplan-state-machine.svg",p)

def capability_matrix():
    caps=evidence("capability-matrix.json")["capabilities"]; p=canvas("Figure 4 | Capability evidence matrix","Capability areas mapped to verification status and evidence boundary.",1200,760); p.append('<text x="48" y="86" class="panel">(a) Evidence-backed status by capability area</text>'); cols=[("Verified",BLUE),("Partial",AMBER),("Blocked",RED),("Deferred",MUTED)]; x0,y0=390,135
    for i,(n,_) in enumerate(cols): p.append(f'<text x="{x0+i*170+60}" y="{y0}" class="body" text-anchor="middle">{n}</text>')
    for r,item in enumerate(caps):
        y=y0+36+r*44; p.append(f'<text x="70" y="{y+5}" class="body">{esc(item["category"])}</text>')
        for c,(n,color) in enumerate(cols):
            x=x0+c*170+48; p.append(f'<rect x="{x}" y="{y-14}" width="24" height="24" fill="#fff" stroke="{LINE}"/>'); item["status"]==n.lower() and p.append(f'<circle cx="{x+12}" cy="{y-2}" r="8" fill="{color}"/>')
    p.append('<text x="70" y="730" class="small">Status is evidence-based; external signing, funded execution and upstream failures are not counted as verified.</text>'); save("figure-04-capability-evidence-matrix.svg",p)

def error_taxonomy():
    p=canvas("Figure 5 | API behavior and failure taxonomy","Observed HTTP and business-code combinations mapped to Ariadne handling decisions."); p.append('<text x="48" y="86" class="panel">(a) Response classification</text>'); rows=[("HTTP 200 + code 0","success",BLUE,"return normalized data"),("HTTP 200 + code 50000","upstream error",RED,"preserve error; never return empty data"),("42900","rate limit",AMBER,"retry according to policy"),("HTTP 5xx","server failure",AMBER,"retry according to policy")]
    for i,(raw,kind,color,act) in enumerate(rows): y=140+i*74; box(p,70,y,245,54,raw,"observed response","#fff",color); arrow(p,325,y+27,435,y+27); box(p,445,y,220,54,kind,"classification","#fff",color); arrow(p,675,y+27,785,y+27); box(p,795,y,335,54,act,"client behavior","#fff",LINE)
    p.append('<text x="48" y="490" class="panel">(b) DeFi Positions request variants</text>'); headers=["Variant","HTTP","Business code","Remaining","Classification"]; xs=[70,330,460,650,820]
    for x,h in zip(xs,headers): p.append(f'<text x="{x}" y="530" class="body">{h}</text>')
    for i in range(3):
        y=570+i*35
        for x,v in zip(xs,[f"Variant {i+1}","200","50000","4 / 5","upstream service error"]): p.append(f'<text x="{x}" y="{y}" class="small">{v}</text>')
    save("figure-05-api-failure-taxonomy.svg",p)

def observability():
    p=canvas("Figure 6 | Request observability trace","A request trace showing fields used to classify retries and final outcomes."); p.append('<text x="48" y="86" class="panel">(a) Read/prepare request trace</text>'); xs=[110,300,500,700,900,1080]; labels=["request","attempt 0","response","classification","retry/return","structured result"]
    for i,(x,l) in enumerate(zip(xs,labels)): p.append(f'<circle cx="{x}" cy="245" r="20" fill="{BLUE if i in [0,1,5] else AMBER}"/><text x="{x}" y="300" class="body" text-anchor="middle">{l}</text>'); i<len(xs)-1 and arrow(p,x+22,245,xs[i+1]-22,245)
    p.append('<text x="48" y="390" class="panel">(b) Recorded fields</text>'); fields=[("durationMs","latency of each attempt"),("attempt","retry count"),("status","HTTP response status"),("code","business response code"),("rateLimitHeaders","remaining quota"),("success","final client classification")]
    for i,(f,d) in enumerate(fields): box(p,90+(i%3)*360,450+(i//3)*72,300,48,f,d,"#fff",LINE)
    p.append('<text x="48" y="650" class="small">These fields support reproducible diagnosis without exposing credentials or private wallet material.</text>'); save("figure-06-observability-trace.svg",p)

if __name__ == "__main__":
    architecture(); workflow(); action_plan(); capability_matrix(); error_taxonomy(); observability(); print(f"Generated {len(list(OUT.glob('figure-*.svg')))} figures in {OUT}")
