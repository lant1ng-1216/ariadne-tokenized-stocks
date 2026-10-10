import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { ARIADNE_RELIEF_MARK } from "./ariadne-brand-asset.js";
import { BNB_CHAIN_OFFICIAL_YELLOW_SYMBOL } from "./official-brand-assets.js";

const entryPoint = fileURLToPath(
  new URL("./external-wallet-approval-page.ts", import.meta.url),
);

export async function buildExternalWalletApprovalPageHtml(language: "zh-CN" | "en" = "zh-CN"): Promise<string> {
  const bundle = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    target: ["es2022"],
    legalComments: "none",
    minify: true,
    logLevel: "silent",
  });
  const javascript = bundle.outputFiles[0]?.text;
  if (!javascript)
    throw new Error("Ariadne external wallet page bundle was empty");
  const safeScript = javascript.replace(/<\/script/gi, "<\\/script");
  const html = `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="referrer" content="no-referrer">
<title>Ariadne · 购买复核</title>
<style>
:root{color-scheme:dark;font-family:Inter,"SF Pro Display","PingFang SC",ui-sans-serif,system-ui,-apple-system,sans-serif;--bg:#030303;--panel:#0d0b0a;--ink:#f3eee7;--muted:#8b837a;--line:#ffffff17;--red:#e44f34;--hot:#ff795b;--green:#86cea0;--ease:cubic-bezier(.2,.82,.2,1)}
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--ink)}body{-webkit-font-smoothing:antialiased}button{font:inherit;color:inherit}a{color:inherit}
.app{position:relative;width:100%;height:100dvh;min-height:620px;overflow:hidden;background:#030303}
.intro{position:absolute;inset:0;z-index:20;display:grid;place-items:center;overflow:hidden;background:#030303;transition:opacity .85s var(--ease),visibility .85s}
.app[data-view=dashboard] .intro{opacity:0;visibility:hidden;pointer-events:none}
.badge-stage{position:relative;width:min(76vh,720px);aspect-ratio:1;display:grid;place-items:center;perspective:1400px}.badge-canvas{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 35px 65px #000c)}.badge-fallback{width:58%;height:auto;opacity:0;filter:drop-shadow(0 25px 50px #000d)}.no-webgl .badge-fallback{opacity:1;animation:fallback-turn 1.7s var(--ease) both}.no-webgl .badge-canvas{display:none}
.intro-copy{position:absolute;left:50%;bottom:7%;width:min(88vw,720px);transform:translateX(-50%);text-align:center}.intro-kicker{color:#ec684e;font-size:9px;font-weight:700;letter-spacing:.28em;text-transform:uppercase}.intro-copy h1{margin:12px 0 0;font-family:Georgia,"Songti SC",serif;font-size:clamp(30px,3.4vw,52px);font-weight:400;line-height:1}.intro-status{margin:12px auto 0;color:#9d958b;font-size:10px;line-height:1.6}.loader{width:min(420px,70vw);height:1px;margin:18px auto 0;background:#ffffff12;overflow:hidden}.loader i{display:block;width:35%;height:100%;background:linear-gradient(90deg,transparent,var(--hot),transparent);animation:loadline 1.4s ease-in-out infinite}
.dashboard{position:absolute;inset:0;z-index:5;display:grid;grid-template-rows:62px minmax(0,1fr) 48px;opacity:0;transform:scale(1.018);transition:opacity .85s .15s var(--ease),transform 1s .15s var(--ease);background:radial-gradient(circle at 85% 15%,#4a1a1119,transparent 25%),#080706}.app[data-view=dashboard] .dashboard{opacity:1;transform:none}
.topbar,.footbar{width:calc(100% - clamp(36px,5vw,90px));margin-inline:auto;display:flex;align-items:center}.topbar{border-bottom:1px solid var(--line)}.footbar{border-top:1px solid var(--line);gap:18px}.wordmark{display:flex;align-items:center;gap:10px;font-family:Georgia,serif;font-size:18px}.wordmark:before{content:"";width:4px;height:25px;border-radius:5px;background:linear-gradient(var(--hot),#a52d20);transform:skew(-12deg)}.asset-strip{display:flex;align-items:center;gap:10px;margin-left:28px;padding-left:28px;border-left:1px solid var(--line)}.asset-strip strong{font-size:12px}.asset-strip span{color:var(--muted);font-size:9px}.network{margin-left:auto;display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #ffffff20;border-radius:99px;color:#c4bbb1;font-size:8px;letter-spacing:.12em}.network img{width:16px;height:16px;object-fit:contain}
.trade-shell{width:calc(100% - clamp(36px,5vw,90px));height:100%;margin-inline:auto;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(390px,.72fr);gap:clamp(24px,3vw,52px);min-height:0}.market-side,.plan-side{min-height:0;padding:clamp(20px,2.8vh,34px) 0}
.market-side{display:grid;grid-template-rows:auto minmax(0,1fr) auto}.market-head{display:flex;align-items:end;gap:20px;padding-bottom:15px}.price-now strong{display:block;font-family:Inter,"SF Pro Display","PingFang SC",ui-sans-serif,system-ui,sans-serif;font-size:clamp(34px,3.8vw,58px);font-weight:650;letter-spacing:-.035em;line-height:.92;font-variant-numeric:tabular-nums lining-nums}.price-now span{display:block;margin-top:8px;color:var(--muted);font-size:8px}.price-delta{margin-left:8px;font-size:11px!important}.market-meta{margin-left:auto;text-align:right;color:#777069;font-size:8px;line-height:1.7}.chart-block{position:relative;min-height:0;border-block:1px solid var(--line);background:linear-gradient(180deg,#0b0a09,#080706)}.chart-block[hidden]{display:none}.chart-canvas{position:absolute;inset:38px 0 25px;width:100%;height:auto}.chart-controls{height:38px;display:flex;align-items:center;justify-content:space-between;gap:12px}.chart-label{color:#817970;font-size:8px}.intervals{display:flex;gap:3px}.intervals button{border:0;background:none;padding:5px 7px;color:#716a63;font-size:8px;cursor:pointer}.intervals button[aria-pressed=true]{color:#efaa98;border-bottom:1px solid var(--red)}.chart-fallback{position:absolute;inset:38px 0 25px;display:grid;place-items:center;color:#817970;font-size:9px;text-align:center}.chart-fallback[hidden]{display:none}.chart-credit{position:absolute;left:0;right:0;bottom:6px;display:flex;justify-content:space-between;color:#5f5a54;font-size:7px}.chart-credit a{text-decoration:underline}.market-foot{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);margin-top:14px}.market-stat{padding:11px 13px;background:#0b0a09}.market-stat span{display:block;color:#746d66;font-size:7px}.market-stat strong{display:block;margin-top:6px;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums lining-nums}
.plan-side{display:grid;grid-template-rows:auto auto minmax(0,1fr);align-content:stretch;overflow:hidden;border-left:1px solid var(--line);padding-left:clamp(24px,3vw,46px)}.plan-head{display:flex;align-items:center;gap:13px;padding:2px 0 17px;border-bottom:1px solid var(--line)}.asset-mark{width:58px;height:58px;display:grid;place-items:center;overflow:hidden;border:1px solid #ffffff1f;border-radius:14px;background:#11110f}.asset-mark img{width:88%;height:88%;object-fit:contain}.asset-mark span{color:#a49a90;font-size:13px;font-weight:700}.asset-copy{min-width:0}.asset-copy strong{display:block;font-family:Inter,"SF Pro Display","PingFang SC",ui-sans-serif,system-ui,sans-serif;font-size:20px;font-weight:650;line-height:1.18}.asset-copy>small{display:block;margin-top:5px;color:#9a9188;font-size:8px}.asset-copy span{display:flex;align-items:center;gap:6px;margin-top:6px;color:var(--muted);font-size:8px}.issuer-logo{width:14px;height:14px;object-fit:contain;border-radius:3px}.hero-amount{margin-left:auto;text-align:right}.hero-amount strong{display:block;font-family:Inter,"SF Pro Display",ui-sans-serif,system-ui,sans-serif;font-size:31px;font-weight:650;letter-spacing:-.025em;line-height:.9;font-variant-numeric:tabular-nums lining-nums}.hero-amount span{display:block;margin-top:6px;color:var(--muted);font-size:8px}
.comparison{padding:8px 0 5px}.compare-head,.compare-row{display:grid;grid-template-columns:minmax(86px,.76fr) minmax(0,1.18fr) minmax(0,1.18fr) minmax(58px,.62fr);align-items:center;gap:10px}.compare-head{padding:8px 10px;color:#6f6861;font-size:7px;text-transform:uppercase;letter-spacing:.06em}.compare-row{min-height:55px;padding:10px;border-top:1px solid #ffffff0d}.compare-label{color:#9b9288;font-size:8px}.compare-value{color:#eee8df;font-size:12px;font-weight:620;font-variant-numeric:tabular-nums lining-nums;line-height:1.25;overflow-wrap:anywhere}.compare-delta{justify-self:end;text-align:right;color:#817a72;font-size:8px}.limits-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin-top:8px;background:var(--line)}.limit{padding:10px;background:#0b0a09;min-width:0}.limit span{display:block;color:#716a63;font-size:7px}.limit strong{display:block;margin-top:5px;color:#ddd5cc;font-size:10px;font-weight:620;font-variant-numeric:tabular-nums lining-nums;overflow-wrap:anywhere}.delta:before{content:"↗";margin-right:3px}.delta[data-direction=down]:before{content:"↘"}.delta[data-direction=up]{color:var(--green)!important}.delta[data-direction=down]{color:#f38b72!important}.delta[data-direction=unknown]{color:#817a72!important}.delta[data-direction=unknown]:before{content:"·"}.price-flash{animation:flash .55s var(--ease)}
.wallet-zone{
  position:relative;
  display:flex;
  flex-direction:column;
  margin-top:12px;
  max-height:none;
  min-height:0;
  overflow-x:hidden;
  overflow-y:auto;
  overscroll-behavior:contain;
  scrollbar-gutter:stable;
  scrollbar-width:thin;
  scrollbar-color:#50443d transparent;
  padding:10px 0 8px;
  border:0;
  border-top:1px solid var(--line);
  border-radius:0;
  background:transparent
}
.wallet-zone::-webkit-scrollbar{width:5px}
.wallet-zone::-webkit-scrollbar-thumb{border-radius:5px;background:#50443d}
.wallet-zone::-webkit-scrollbar-track{background:transparent}
.wallet-zone:focus-visible{outline:1px solid #e26a51;outline-offset:2px}
.execution-head{
  position:sticky;
  top:-10px;
  z-index:3;
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:12px;
  margin:0;
  padding:0 0 8px;
  border-bottom:1px solid #ffffff0d;
  background:#080706f2
}
.execution-kicker{display:block;color:#e26a51;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:8px;font-weight:700;letter-spacing:.12em}
.execution-head strong{display:block;margin-top:4px;font-size:13px;font-weight:620;line-height:1.25;overflow-wrap:anywhere}
.execution-time{color:#81786f;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:8px;white-space:nowrap}
.execution-focus{display:grid;grid-template-columns:42px minmax(0,1fr) minmax(72px,.52fr);gap:10px;align-items:center;margin-top:7px;padding:8px 0;border-bottom:1px solid #ffffff12}
.stage-code{display:flex;flex-direction:column;justify-content:center;gap:3px}
.stage-code strong{color:#eee8df;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;font-weight:500;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.stage-code span{color:#e27660;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:7px;font-weight:700;letter-spacing:.04em;overflow-wrap:anywhere}
.allowance-focus{min-width:0}
.allowance-label{display:flex;justify-content:space-between;gap:8px;color:#81786f;font-size:7px}
.allowance-value{display:flex;align-items:baseline;gap:5px;margin-top:4px}
.allowance-value strong{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;font-weight:620;letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.allowance-value span{color:#a29a90;font-size:8px}
.status{margin:5px 0 0;color:#b8afa6;font-size:9px;line-height:1.45;overflow-wrap:anywhere}
.status[data-kind=error]{color:#f39a82}
.status[data-kind=success]{color:var(--green)}
.execution-gap{display:flex;flex-direction:column;justify-content:center;gap:4px;padding-left:10px;border-left:1px solid #ffffff12}
.execution-gap span{color:#81786f;font-size:7px}
.execution-gap strong{display:block;margin-top:4px;color:#eee8df;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:620;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.execution-gap small{color:#8d857c;font-size:7px;line-height:1.35;overflow-wrap:anywhere}
.journey-track{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0;padding:3px 0 7px;border-bottom:1px solid #ffffff12;list-style:none}
.flow-step{min-width:0;display:grid;grid-template-columns:18px minmax(0,1fr) 13px;align-items:center;gap:5px;padding:7px 6px;border-bottom:1px solid #ffffff0a;border-right:1px solid #ffffff0a;color:#a79e94;font-size:8px}
.flow-step:nth-child(3n){border-right:0}
.flow-step i{color:#776f66;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:7px;font-style:normal;font-variant-numeric:tabular-nums}
.flow-step span{min-width:0;overflow-wrap:anywhere}
.flow-step .flow-state{justify-self:end;color:#6f685f;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:700}
.flow-step .flow-state:before{content:"–"}
.flow-step[data-state=active]{color:#f0aa97}
.flow-step[data-state=active] .flow-state{color:var(--hot)}
.flow-step[data-state=active] .flow-state:before{content:">"}
.flow-step[data-state=done]{color:#b9cdbd}
.flow-step[data-state=done] .flow-state{color:var(--green)}
.flow-step[data-state=done] .flow-state:before{content:"✓"}
.flow-step[data-state=error]{color:#f38b72}
.flow-step[data-state=error] .flow-state{color:#f38b72}
.flow-step[data-state=error] .flow-state:before{content:"!"}
.execution-tail{display:grid;grid-template-columns:minmax(0,1fr) minmax(94px,.5fr);gap:9px 14px;margin-top:7px;padding-top:7px}
.execution-route{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-column:1/-1}
.route-fact{min-width:0;padding-right:9px}
.route-fact+.route-fact{padding-left:9px;border-left:1px solid #ffffff0d}
.route-fact span,.event-trace>span,.next-action>span{display:block;color:#81786f;font-size:7px}
.route-fact strong{display:block;margin-top:4px;color:#d5cdc4;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:8px;font-weight:550;line-height:1.4;overflow-wrap:anywhere}
.event-trace{min-width:0;padding-top:7px;border-top:1px solid #ffffff0d}
.event-trace ol{display:grid;gap:4px;margin:5px 0 0;padding:0;list-style:none}
.event-trace li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;color:#a29a90;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:8px;line-height:1.4;overflow-wrap:anywhere}
.event-trace time{color:#7c746b;font-variant-numeric:tabular-nums;white-space:nowrap}
.event-trace li:last-child span{color:#ddd5cc}
.next-action{text-align:left;align-self:start;min-width:0;padding-top:7px;border-top:1px solid #ffffff0d}
.next-action strong{display:block;margin-top:5px;color:#eee8df;font-size:9px;font-weight:620;line-height:1.4;overflow-wrap:anywhere}
.post-transaction-actions{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr);align-items:start;gap:5px;margin-top:2px;padding-top:8px;border-top:1px solid #ffffff12}
.post-transaction-actions[hidden]{display:none}
.post-transaction-copy strong{display:block;color:#ddd6ce;font-size:8px}
.post-transaction-copy span{display:block;margin-top:3px;color:#969087;font-size:8px;line-height:1.4;overflow-wrap:anywhere}
.post-action{justify-self:start;border:0;border-bottom:1px solid #ef684d;background:none;color:#f09b87;font:inherit;font-size:8px;line-height:24px;text-decoration:none;white-space:normal;text-align:left;cursor:pointer}
.post-action:disabled{opacity:.45;cursor:default}
.quote-accept{min-height:25px;padding:0;border:0;border-bottom:1px solid #ef684d;background:none;color:#f09b87;font-size:8px;cursor:pointer;white-space:normal;text-align:left}
.quote-accept[hidden]{display:none}
.quote-decision{grid-column:1/-1;color:#dfb483;font-size:8px;line-height:1.45;overflow-wrap:anywhere}
.quote-decision:empty{display:none}
.quote-decision p{margin:4px 0 0}
.source{display:flex;align-items:center;gap:8px;color:#716a63;font-size:7px;min-width:0}.source i{width:5px;height:5px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px #86cea017}.source span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.diagnostic{margin-left:auto;color:#827a72;font-size:7px;letter-spacing:.06em}.foot-actions{display:flex;gap:14px;margin-left:14px}.drawer>summary{list-style:none;cursor:pointer;color:#918980;font-size:8px}.drawer>summary::-webkit-details-marker{display:none}.drawer>summary:after{content:" ＋";color:var(--red)}.drawer[open]>summary:after{content:" －"}.drawer-panel{position:fixed;z-index:70;right:clamp(18px,4vw,68px);bottom:55px;width:min(620px,calc(100vw - 36px));max-height:70vh;overflow:auto;padding:20px;background:#11100ff8;border:1px solid #ffffff1e;box-shadow:0 25px 80px #000d;backdrop-filter:blur(22px)}.drawer-title{display:flex;justify-content:space-between;padding-bottom:11px;border-bottom:1px solid var(--line);font-size:10px}.plan{display:grid;margin:0}.plan-row{display:grid;grid-template-columns:minmax(120px,.42fr) 1fr;gap:16px;padding:8px 0;border-bottom:1px solid #ffffff0c}.plan-row dt{color:#746d66;font-size:8px}.plan-row dd{margin:0;color:#c5bdb4;font-size:8px;line-height:1.45;overflow-wrap:anywhere}
@keyframes loadline{0%{transform:translateX(-120%)}100%{transform:translateX(390%)}}@keyframes fallback-turn{from{opacity:0;transform:perspective(900px) rotateY(-120deg) scale(.7)}to{opacity:1;transform:perspective(900px) rotateY(0) scale(1)}}@keyframes flash{50%{color:var(--hot);text-shadow:0 0 15px #e34d3266}}
@media(max-height:760px) and (min-width:821px){.app{min-height:560px}.dashboard{grid-template-rows:54px minmax(0,1fr) 42px}.market-side,.plan-side{padding:14px 0}.plan-side{padding-left:28px}.market-head{padding-bottom:10px}.plan-head{padding-bottom:10px}.compare-row{min-height:46px;padding:7px 9px}.limit{padding:7px 9px}.wallet-zone{margin-top:6px;padding:8px 0 6px}.execution-head{top:-8px;padding:8px 0 7px}.execution-focus{margin-top:5px;padding:6px 0}.flow-step{padding-block:5px}.execution-tail{margin-top:6px;padding-top:6px}.badge-stage{width:min(72vh,620px)}.intro-copy{bottom:4%}.intro-copy h1{font-size:32px;margin-top:7px}.intro-status{margin-top:7px}.loader{margin-top:10px}}
@media(max-width:820px){html,body{overflow:auto}.app{height:auto;min-height:100dvh;overflow:visible}.dashboard{position:relative;min-height:100dvh;grid-template-rows:58px auto 48px}.trade-shell{grid-template-columns:1fr;height:auto}.market-side{min-height:55vh}.plan-side{grid-template-rows:auto auto auto;align-content:start;overflow:visible;border-left:0;border-top:1px solid var(--line);padding-left:0}.intro{position:fixed}.asset-strip{display:none}.chart-block{min-height:360px}.chart-canvas{height:auto}.compare-head,.compare-row{grid-template-columns:minmax(72px,.7fr) minmax(0,1fr) minmax(0,1fr)}.compare-head span:last-child,.compare-delta{display:none}.wallet-zone{height:auto;max-height:none;overflow:visible;scrollbar-gutter:auto}.journey-track{grid-template-columns:repeat(2,minmax(0,1fr))}.flow-step:nth-child(3n){border-right:1px solid #ffffff0a}.flow-step:nth-child(2n){border-right:0}.execution-head{position:static;padding:0 0 8px;background:transparent}.post-transaction-actions{grid-template-columns:1fr;justify-items:start}.drawer-panel{position:fixed}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}.app[data-view=dashboard] .intro{display:none}.dashboard{opacity:1;transform:none}}
</style></head><body>
<main id="app" class="app" data-view="intro" aria-labelledby="portal-title">
  <section class="intro" aria-label="Ariadne 正在准备购买计划">
    <div class="badge-stage"><canvas id="badge-canvas" class="badge-canvas" aria-label="旋转的 Ariadne 三维徽章"></canvas><img class="badge-fallback" src="${ARIADNE_RELIEF_MARK}" alt="Ariadne 标志"></div>
    <div class="intro-copy"><div class="intro-kicker">ARIADNE · BSC PURCHASE</div><h1>沿着同一条线，<br>把意图带到钱包。</h1><p class="intro-status" id="intro-status">正在读取你确认的购买计划…</p><div class="loader" aria-hidden="true"><i></i></div></div>
  </section>
  <section class="dashboard" aria-label="购买复核交易界面">
    <header class="topbar"><div class="wordmark">Ariadne</div><div class="asset-strip"><strong id="asset-title">读取标的</strong><span id="asset-meta">BSC · 正在核对发行方</span></div><span class="network"><img src="${BNB_CHAIN_OFFICIAL_YELLOW_SYMBOL}" alt="BNB Chain">BSC</span></header>
    <div class="trade-shell">
      <section class="market-side" aria-label="NVDAB 行情">
        <header class="market-head"><div class="price-now"><strong id="current-price">读取中</strong><span><b id="market-symbol">—</b> · Binance Web3 当前价格 <em class="delta price-delta" id="price-delta" data-direction="unknown">等待比较</em></span></div><div class="market-meta"><span id="market-time">等待 Binance Web3 快照</span><br><span id="portal-step-label">原计划 → 最新执行条件</span></div></header>
        <section class="chart-block" id="chart-block" hidden><div class="chart-controls"><span class="chart-label">BSC 代币行情 · Binance Web3</span><div class="intervals" role="group" aria-label="K 线时间周期"><button type="button" data-chart-interval="1m" aria-pressed="false">1分</button><button type="button" data-chart-interval="5m" aria-pressed="true">5分</button><button type="button" data-chart-interval="15m" aria-pressed="false">15分</button><button type="button" data-chart-interval="1h" aria-pressed="false">1时</button><button type="button" data-chart-interval="1d" aria-pressed="false">1日</button></div></div><div class="chart-canvas" id="market-chart" role="img" aria-label="Binance Web3 返回的 BSC 代币 OHLC K 线"></div><div class="chart-fallback" id="chart-fallback" role="status" hidden>正在读取 Binance Web3 K 线…</div><div class="chart-credit"><span id="chart-status">正在读取 Binance Web3 K 线…</span><a href="https://tradingview.github.io/lightweight-charts/" target="_blank" rel="noopener noreferrer">图表组件 · TradingView Lightweight Charts</a></div></section>
        <div class="market-foot"><div class="market-stat"><span>原计划价格</span><strong id="baseline-price">—</strong></div><div class="market-stat"><span>参考价格</span><strong id="reference-price">—</strong></div><div class="market-stat"><span>数据时间</span><strong id="baseline-time">—</strong></div></div>
      </section>
      <aside class="plan-side" aria-label="原计划与当前执行对比">
        <header class="plan-head"><div class="asset-mark"><img id="asset-logo" hidden alt=""><span id="asset-logo-fallback" aria-hidden="true">STOCK</span></div><div class="asset-copy"><strong id="portal-title">计划复核</strong><small id="asset-identity">读取股票身份</small><span><img id="issuer-logo" class="issuer-logo" hidden alt=""><b id="portal-eyebrow">同一份 BSC 买入计划</b></span></div><div class="hero-amount"><strong id="hero-amount">—</strong><span id="hero-currency">USDT 买入</span></div></header>
        <section class="comparison" aria-label="购买计划差异">
          <div class="compare-head"><span>项目</span><span>原计划</span><span>当前</span><span>变化</span></div>
          <div class="compare-row"><span class="compare-label">预计到账</span><strong class="compare-value" id="baseline-output">—</strong><strong class="compare-value" id="plan-output">—</strong><span class="compare-delta delta" id="output-change" data-direction="unknown">等待比较</span></div>
          <div class="compare-row"><span class="compare-label">最低到账</span><strong class="compare-value" id="baseline-minimum">—</strong><strong class="compare-value" id="order-minimum">—</strong><span class="compare-delta">保护下限</span></div>
          <div class="compare-row"><span class="compare-label">预计网络费</span><strong class="compare-value" id="baseline-network-fee">—</strong><strong class="compare-value" id="network-fee">—</strong><span class="compare-delta delta" id="network-fee-change" data-direction="unknown">等待比较</span></div>
          <div class="limits-strip"><div class="limit"><span>滑点上限</span><strong id="slippage-cap">—</strong></div><div class="limit"><span>路由费用</span><strong id="route-fee">—</strong></div><div class="limit"><span>计划基准</span><strong id="baseline-output-note">计划确认时</strong></div></div>
        </section>
        <section class="wallet-zone" role="region" tabindex="0" aria-label="Ariadne 交易执行终端" aria-describedby="execution-title status">
          <header class="execution-head"><div><span class="execution-kicker">ARIADNE EXECUTION CONSOLE</span><strong id="execution-title">正在核对购买计划</strong></div><span class="execution-time" id="execution-time">尚未请求钱包</span></header>
          <div class="execution-focus"><div class="stage-code"><strong id="execution-stage-index">01</strong><span id="execution-stage-name">计划核对</span></div><div class="allowance-focus"><div class="allowance-label"><span>USDT 执行额度</span><span id="execution-allowance-state">等待复核</span></div><div class="allowance-value"><strong id="execution-allowance-current">—</strong><span id="execution-allowance-required">/ — USDT</span></div><p class="status" id="status" role="status" aria-live="polite" aria-atomic="true">正在读取已确认的计划…</p></div><div class="execution-gap"><div><span>当前缺口</span><strong id="execution-gap">—</strong></div><small id="execution-funds">尚未产生资金操作</small></div></div>
          <ol class="journey-track" aria-label="执行阶段状态"><li class="flow-step" id="flow-plan" data-state="active"><i>01</i><span>计划</span><b class="flow-state" aria-hidden="true"></b></li><li class="flow-step" id="flow-quote" data-state="upcoming"><i>02</i><span>报价</span><b class="flow-state" aria-hidden="true"></b></li><li class="flow-step" id="flow-allowance" data-state="upcoming"><i>03</i><span>授权</span><b class="flow-state" aria-hidden="true"></b></li><li class="flow-step" id="flow-wallet" data-state="upcoming"><i>04</i><span>钱包</span><b class="flow-state" aria-hidden="true"></b></li><li class="flow-step" id="flow-chain" data-state="upcoming"><i>05</i><span>BSC</span><b class="flow-state" aria-hidden="true"></b></li></ol>
          <div class="execution-tail"><div class="execution-route" aria-label="执行上下文"><div class="route-fact"><span>标的与发行方</span><strong id="execution-request">读取计划</strong></div><div class="route-fact"><span>计划钱包</span><strong id="execution-wallet">—</strong></div><div class="route-fact"><span>保护边界</span><strong id="execution-boundary">—</strong></div></div><div class="event-trace"><span>实时执行记录</span><ol id="execution-events" aria-live="polite"><li><time>--:--:--</time><span>等待读取同一份购买计划</span></li></ol></div><div class="next-action"><span>当前唯一动作</span><strong id="execution-next-action">刷新执行条件</strong></div><div class="post-transaction-actions" id="post-transaction-actions" hidden><div class="post-transaction-copy"><strong id="post-transaction-summary">MetaMask 已提交这笔购买</strong><span id="watch-asset-status">可核对链上记录，并让 MetaMask 显示本次购买的股票代币。</span></div><a class="post-action" id="explorer-link" href="#" target="_blank" rel="noopener noreferrer">在 BscScan 查看交易进度</a><button class="post-action" id="watch-asset" type="button">添加股票代币到 MetaMask</button></div><div id="quote-decision" class="quote-decision" aria-live="polite"></div></div>
        </section>
      </aside>
    </div>
    <footer class="footbar"><div class="source"><i></i><span id="market-updated">等待 Binance Web3 快照</span></div><span class="diagnostic" id="diagnostic-stage">PAGE · WAITING</span><div class="foot-actions"><details class="drawer"><summary>完整交易信息</summary><div class="drawer-panel"><div class="drawer-title"><span>完整计划与交易参数</span><span>由钱包最终确认</span></div><dl id="plan" class="plan" aria-label="完整购买计划与交易参数"></dl></div></details></div><span hidden id="portal-lede"></span><span hidden id="plan-amount"></span><span hidden id="plan-currency"></span><span hidden id="plan-minimum"></span><span hidden id="order-amount"></span><span hidden id="order-currency"></span><span hidden id="order-output"></span></footer>
  </section>
</main>
<script type="module">${safeScript}</script>
</body></html>`;
  if (language === "zh-CN") return html;
  const translations: Array<[string, string]> = [
    ['<html lang="zh-CN">', '<html lang="en">'],
    ["Ariadne · 购买复核", "Ariadne · Purchase review"],
    ["Ariadne 正在准备购买计划", "Ariadne is preparing your purchase"],
    ["旋转的 Ariadne 三维徽章", "Rotating three-dimensional Ariadne emblem"],
    ["Ariadne 标志", "Ariadne mark"],
    ["沿着同一条线，<br>把意图带到钱包。", "One intent,<br>carried into your wallet."],
    ["正在读取你确认的购买计划…", "Loading your confirmed purchase intent…"],
    ["购买复核交易界面", "Purchase review workspace"],
    ["读取标的", "Loading asset"],
    ["BSC · 正在核对发行方", "BSC · Verifying issuer"],
    ["行情", " market"],
    ["读取中", "Loading"],
    ["当前价格", " current price"],
    ["等待比较", "Awaiting comparison"],
    ["等待 Binance Web3 快照", "Waiting for Binance Web3 snapshot"],
    ["原计划 → 最新执行条件", "Original intent → Current execution"],
    ["BSC 代币行情 · Binance Web3", "BSC token market · Binance Web3"],
    ["K 线时间周期", "Candlestick interval"],
    ["1分", "1m"], ["5分", "5m"], ["15分", "15m"], ["1时", "1h"], ["1日", "1d"],
    ["原计划价格", "Intent price"], ["参考价格", "Reference price"], ["数据时间", "Data time"],
    ["原计划与当前执行对比", "Original intent and current execution comparison"],
    ["计划复核", "Plan review"], ["读取股票身份", "Loading stock identity"],
    ["同一份 BSC 买入计划", "One BSC purchase intent"], ["USDT 买入", "USDT purchase"],
    ["购买计划差异", "Purchase plan differences"], ["项目", "Item"], ["原计划", "Original"], ["当前", "Current"], ["变化", "Change"],
    ["预计到账", "Expected output"], ["最低到账", "Minimum output"], ["保护下限", "Protected minimum"],
    ["预计网络费", "Estimated network fee"], ["滑点上限", "Max slippage"], ["路由费用", "Route fee"],
    ["计划基准", "Intent baseline"], ["计划确认时", "At intent confirmation"],
    ["Ariadne 交易执行终端", "Ariadne execution terminal"], ["正在核对购买计划", "Checking purchase intent"],
    ["尚未请求钱包", "Wallet not requested"], ["计划核对", "Intent check"], ["USDT 执行额度", "USDT allowance"],
    ["等待复核", "Awaiting review"], ["正在读取已确认的计划…", "Loading the confirmed intent…"],
    ["当前缺口", "Current gap"], ["尚未产生资金操作", "No funds action has occurred"],
    ["执行阶段状态", "Execution stage status"],
    [">计划<", ">Intent<"], [">报价<", ">Quote<"], [">授权<", ">Allowance<"], [">钱包<", ">Wallet<"],
    ["标的与发行方", "Asset and issuer"], ["读取计划", "Loading intent"], ["计划钱包", "Wallet"], ["保护边界", "Protection"],
    ["实时执行记录", "Live execution log"], ["等待读取同一份购买计划", "Waiting to load this purchase intent"],
    ["当前唯一动作", "Current action"], ["刷新执行条件", "Refresh execution conditions"],
    ["完整交易信息", "Full transaction details"], ["完整计划与交易参数", "Full plan and transaction parameters"], ["由钱包最终确认", "Final confirmation in wallet"]
  ];
  return translations.reduce((value, [from, to]) => value.replaceAll(from, to), html);
}
