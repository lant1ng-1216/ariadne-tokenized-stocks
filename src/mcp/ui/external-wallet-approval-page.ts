import { selectMetaMaskProvider, type AnnouncedEip1193Provider } from "./eip1193-discovery.js";
import type { Eip1193WalletProvider } from "./purchase-approval-flow.js";
import { CandlestickSeries, ColorType, CrosshairMode, createChart, type CandlestickData, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { AmbientLight, CanvasTexture, CircleGeometry, Color, CylinderGeometry, Group, Mesh, MeshPhysicalMaterial, PerspectiveCamera, PointLight, Scene, SRGBColorSpace, TorusGeometry, WebGLRenderer } from "three";
import { ARIADNE_RELIEF_MARK } from "./ariadne-brand-asset.js";
import { OFFICIAL_UNDERLYING_LOGOS } from "./official-brand-assets.js";
import { createEVMClient, type MetamaskConnectEVM } from "@metamask/connect-evm";
import { bscScanTransactionUrl, walletWatchAssetRequest } from "./post-transaction-actions.js";

type PortalWindow = Window & {
  ethereum?: Eip1193WalletProvider & { isMetaMask?: boolean; providers?: Array<Eip1193WalletProvider & { isMetaMask?: boolean }> };
};
type MarketSnapshot = {
  state: "available" | "unavailable";
  source?: string;
  fetchedAt?: number;
  tokenPrice?: string;
  referencePrice?: string;
  tokenPriceUpdatedAt?: number;
};
type MarketCandles = {
  state: "available" | "unavailable";
  source?: string;
  fetchedAt?: number;
  interval?: string;
  candles?: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>;
};
type ClientStage = "page_loaded" | "plan_loaded" | "quote_refresh_started" | "quote_ready" | "provider_discovery_started" | "provider_selected" | "account_lookup_started" | "account_lookup_resolved" | "account_request_started" | "account_ready" | "connect_execute_started" | "connect_execute_resolved" | "transaction_request_started" | "transaction_request_resolved" | "client_error";

const rootElement = document.querySelector<HTMLElement>("#app");
if (!rootElement) throw new Error("Ariadne external wallet portal root is missing");
const root: HTMLElement = rootElement;
const pageLanguage = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "zh-CN";
document.documentElement.lang = pageLanguage;
const ui = (zh: string, en: string) => pageLanguage === "en" ? en : zh;

let handoffId = "";
let capability = "";
let walletAttemptId = "";
let snapshot: Record<string, unknown> | undefined;
let walletAttemptStarted = false;
let walletAttemptClaimedByThisPage = false;
let walletTransactionCallStarted = false;
let metaMaskClient: MetamaskConnectEVM | undefined;
let connectExecutePending = false;
let submittedTransactionHash = "";
let polling = false;
let marketLoopStarted = false;
let latestMarket: MarketSnapshot | undefined;
let currentChartInterval = "5m";
let chartContext: { chart: IChartApi; series: ISeriesApi<"Candlestick"> } | undefined;
let chartRefreshTimer: number | undefined;
let chartRefreshInFlight = false;
let chartDataLoaded = false;
let chartControlsBound = false;
let stopBadgeAnimation: (() => void) | undefined;
let lastExecutionEvent = "";
let lastRenderedPlanId = "";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const introMinimum = new Promise<void>((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 1_850));

function setIntroStatus(message: string) {
  const node = document.querySelector<HTMLElement>("#intro-status");
  if (node) node.textContent = message;
}

function setDiagnosticStage(stage: string) {
  const node = document.querySelector<HTMLElement>("#diagnostic-stage");
  if (node) node.textContent = stage;
}

function startCinematicBadge() {
  const canvas = document.querySelector<HTMLCanvasElement>("#badge-canvas");
  const stage = document.querySelector<HTMLElement>(".badge-stage");
  if (!canvas || !stage) return;
  try {
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    const scene = new Scene();
    const camera = new PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 10.5);
    const rig = new Group();
    scene.add(rig);
    const shell = new Mesh(new CylinderGeometry(2.62, 2.62, 0.34, 96), new MeshPhysicalMaterial({ color: new Color("#14110f"), metalness: 0.88, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.16 }));
    shell.rotation.x = Math.PI / 2;
    rig.add(shell);
    const face = new Mesh(new CircleGeometry(2.48, 96), new MeshPhysicalMaterial({ color: new Color("#090807"), metalness: 0.6, roughness: 0.31, clearcoat: 1, clearcoatRoughness: 0.12 }));
    face.position.z = 0.181;
    rig.add(face);
    const rim = new Mesh(new TorusGeometry(2.53, 0.105, 24, 128), new MeshPhysicalMaterial({ color: new Color("#dc482f"), metalness: 0.86, roughness: 0.2, emissive: new Color("#3c0d07"), emissiveIntensity: 0.32, clearcoat: 1 }));
    rim.position.z = 0.23;
    rig.add(rim);
    const image = new Image();
    image.decoding = "async";
    image.src = ARIADNE_RELIEF_MARK;
    image.addEventListener("load", () => {
      const texture = new CanvasTexture(image);
      texture.colorSpace = SRGBColorSpace;
      const mark = new Mesh(new CircleGeometry(2.34, 96), new MeshPhysicalMaterial({ map: texture, transparent: true, roughness: 0.24, metalness: 0.08, clearcoat: 0.85, clearcoatRoughness: 0.18 }));
      mark.position.z = 0.245;
      rig.add(mark);
    }, { once: true });
    scene.add(new AmbientLight(0xffffff, 0.72));
    const key = new PointLight(0xffd8c4, 52, 24); key.position.set(-4.5, 5, 7); scene.add(key);
    const red = new PointLight(0xff4f32, 42, 18); red.position.set(5, -2, 4); scene.add(red);
    const edge = new PointLight(0x89a6ff, 18, 16); edge.position.set(1, 4, -4); scene.add(edge);
    let active = true;
    const startedAt = performance.now();
    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, rect.width); const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(stage); resize();
    const frame = (now: number) => {
      if (!active) return;
      const elapsed = (now - startedAt) / 1_000;
      const intro = Math.min(1, elapsed / 1.55);
      const eased = 1 - Math.pow(1 - intro, 4);
      rig.rotation.y = reducedMotion ? 0 : (-1.82 * (1 - eased) + Math.sin(elapsed * 0.7) * 0.035);
      rig.rotation.x = reducedMotion ? 0 : (0.36 * (1 - eased) + Math.sin(elapsed * 0.52) * 0.018);
      rig.rotation.z = reducedMotion ? 0 : -0.08 * (1 - eased);
      const scale = 0.62 + 0.38 * eased; rig.scale.setScalar(scale);
      rig.position.y = Math.sin(elapsed * 0.9) * 0.06;
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    stopBadgeAnimation = () => { active = false; observer.disconnect(); renderer.dispose(); };
  } catch {
    root.classList.add("no-webgl");
  }
}

async function revealDashboard() {
  await introMinimum;
  root.dataset.view = "dashboard";
  await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 620));
  window.setTimeout(() => stopBadgeAnimation?.(), 900);
}

function localizeKnownStatus(message: string): string {
  if (pageLanguage === "en") {
    const replacements: Array<[string, string]> = [
      ["正在查找此浏览器中的钱包…", "Looking for MetaMask in this browser…"],
      ["正在通过 MetaMask 的单次流程连接计划账户并显示USDT 授权确认…", "Connecting the selected account and opening the USDT allowance confirmation in MetaMask…"],
      ["正在通过 MetaMask 的单次流程连接计划账户并显示股票买入确认…", "Connecting the selected account and opening the stock purchase confirmation in MetaMask…"],
      ["当前 USDT 授权额度不足。正在请求 MetaMask 复核精确额度；授权确认后才会另行显示股票买入。", "USDT allowance is insufficient. MetaMask will show the exact amount; the stock purchase will be presented separately after confirmation."],
      ["同一计划的最新报价和费用已就绪，正在请求 MetaMask 复核…", "The latest quote and fees are ready. Asking MetaMask for review…"],
      ["还没有准备好最新的钱包请求；当前没有发起钱包操作。", "The latest wallet request is not ready; no wallet action was started."],
      ["MetaMask 已返回授权交易编号。正在等 BSC 确认；股票还没有买入。", "MetaMask returned the allowance transaction hash. Waiting for BSC confirmation; the stock has not been purchased yet."],
      ["MetaMask 已返回买入交易编号。正在等 BSC 确认并核对余额…", "MetaMask returned the purchase transaction hash. Waiting for BSC confirmation and balance reconciliation…"],
      ["股票买入已确认：BSC 交易和钱包余额变化均与计划相符。", "Purchase confirmed: the BSC transaction and wallet balance changes match the plan."],
      ["USDT 授权已在 BSC 确认。正在沿用原计划核对实时价格和预计到账…", "USDT allowance is confirmed on BSC. Checking the current price and expected output against the intent…"],
      ["尚未产生资金操作", "No funds action has occurred"],
      ["正在读取已确认的计划…", "Loading the confirmed purchase intent…"]
    ];
    return replacements.reduce((value, [from, to]) => value.replaceAll(from, to), message);
  }
  if (/USDT allowance is not verified as sufficient/i.test(message)) return "USDT 授权额度尚未核实为充足，本次没有生成购买请求。";
  if (/fresh quote changes the original wallet, asset, amount, spender or slippage boundary/i.test(message)) return "最新报价改变了原计划的钱包、资产、金额、授权对象或滑点边界；本次没有发起购买请求。";
  if (/quote expired|current execution quote expired/i.test(message)) return "当前执行报价已过期；原购买意图仍会保留，刷新页面后将重新取得报价。";
  if (/allowance is already sufficient/i.test(message)) return "USDT 授权额度已经足够，无需重复授权；请刷新购买报价。";
  return message;
}

function appendExecutionEvent(message: string) {
  const localized = localizeKnownStatus(message).trim();
  if (!localized || localized === lastExecutionEvent) return;
  lastExecutionEvent = localized;
  const list = document.querySelector<HTMLOListElement>("#execution-events");
  if (!list) return;
  const region = document.querySelector<HTMLElement>(".wallet-zone");
  const wasAtBottom = region ? region.scrollHeight - region.scrollTop - region.clientHeight < 32 : false;
  if (list.children.length === 1 && list.querySelector("time")?.textContent === "--:--:--") list.replaceChildren();
  const item = document.createElement("li");
  const time = document.createElement("time");
  time.dateTime = new Date().toISOString();
  time.textContent = new Date().toLocaleTimeString([], { hour12: false });
  const copy = document.createElement("span");
  copy.textContent = localized;
  item.append(time, copy);
  list.append(item);
  while (list.children.length > 12) list.firstElementChild?.remove();
  if (region && wasAtBottom) region.scrollTop = region.scrollHeight;
}

function setStatus(message: string, kind = "working") {
  const localized = localizeKnownStatus(message);
  const node = document.querySelector<HTMLElement>("#status");
  if (node) {
    node.textContent = localized;
    node.dataset.kind = kind;
  }
}

type WalletStage = "plan" | "quote" | "wallet" | "account" | "request" | "submitted" | "confirmed" | "error";
let activeWalletStep = 0;

function setWalletStage(stage: WalletStage, message: string, kind = "working") {
  root.dataset.walletStage = stage;
  const title = document.querySelector<HTMLElement>("#execution-title");
  const time = document.querySelector<HTMLElement>("#execution-time");
  const stageTitles: Record<WalletStage, string> = {
    plan: ui("正在核对购买计划", "Checking purchase intent"),
    quote: ui("正在刷新执行条件", "Refreshing execution conditions"),
    wallet: ui("正在定位 MetaMask", "Locating MetaMask"),
    account: ui("正在核对钱包账户", "Checking wallet account"),
    request: ui("等待你在 MetaMask 确认", "Waiting for your MetaMask confirmation"),
    submitted: ui("交易已提交至 BSC", "Transaction submitted to BSC"),
    confirmed: ui("购买已完成并核对", "Purchase completed and reconciled"),
    error: ui("执行需要处理", "Action required")
  };
  if (title) title.textContent = stageTitles[stage];
  const stageIndex = document.querySelector<HTMLElement>("#execution-stage-index");
  const stageName = document.querySelector<HTMLElement>("#execution-stage-name");
  const stageIdentity: Record<WalletStage, [string, string]> = {
    plan: ["01", ui("计划核对", "Intent check")], quote: ["02", ui("刷新报价", "Quote refresh")], wallet: ["03", ui("授权与钱包", "Allowance and wallet")],
    account: ["03", ui("账户核对", "Account check")], request: ["04", ui("钱包确认", "Wallet confirmation")], submitted: ["05", ui("BSC 终局", "BSC finality")],
    confirmed: ["05", ui("已完成", "Complete")], error: [String(activeWalletStep + 1).padStart(2, "0"), ui("需要处理", "Action required")]
  };
  if (stageIndex) stageIndex.textContent = stageIdentity[stage][0];
  if (stageName) stageName.textContent = stageIdentity[stage][1];
  if (time) time.textContent = ["request", "submitted", "confirmed", "error"].includes(stage)
    ? `${ui("更新于", "Updated")} ${new Date().toLocaleTimeString()}`
    : ui("自动执行中", "Automatic flow active");
  const allowanceOperation = (snapshot?.display as Record<string, unknown> | undefined)?.operation === "allowance_approval";
  const steps = ["#flow-plan", "#flow-quote", "#flow-allowance", "#flow-wallet", "#flow-chain"];
  const active = stage === "error"
    ? activeWalletStep
    : stage === "plan" ? 0
      : stage === "quote" ? 1
        : ["wallet", "account", "request"].includes(stage) ? (allowanceOperation ? 2 : 3) : 4;
  if (stage !== "error") activeWalletStep = active;
  const complete = stage === "confirmed" ? steps.length : active;
  steps.forEach((selector, index) => {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) return;
    node.dataset.state = index < complete ? "done" : index === active && stage !== "error" ? "active" : "upcoming";
  });
  if (stage === "error") {
    const node = document.querySelector<HTMLElement>(steps[active]!);
    if (node) node.dataset.state = "error";
  }
  const funds = document.querySelector<HTMLElement>("#execution-funds");
  if (funds) funds.textContent = stage === "submitted"
    ? ui("已提交，等待链上确认", "Submitted; awaiting chain confirmation")
    : stage === "confirmed"
      ? ui("链上结果与余额已核对", "Chain result and balances reconciled")
      : stage === "request"
        ? ui("等待你的钱包确认", "Waiting for your wallet confirmation")
        : stage === "error" && walletTransactionCallStarted
          ? ui("结果未核实，请勿重复提交", "Result unverified; do not resubmit")
          : ui("尚未产生资金操作", "No funds action has occurred");
  const next = document.querySelector<HTMLElement>("#execution-next-action");
  const nextLabels: Record<WalletStage, string> = {
    plan: ui("读取原计划", "Load purchase intent"), quote: ui("刷新执行条件", "Refresh execution conditions"), wallet: allowanceOperation ? ui("准备授权", "Prepare allowance") : ui("定位钱包", "Locate wallet"),
    account: ui("核对计划账户", "Check selected account"), request: ui(`在 MetaMask 确认${allowanceOperation ? "授权" : "买入"}`, `Confirm ${allowanceOperation ? "allowance" : "purchase"} in MetaMask`),
    submitted: ui("等待 BSC 确认", "Wait for BSC confirmation"), confirmed: ui("核对交易凭证", "Review transaction evidence"), error: walletTransactionCallStarted ? ui("检查钱包活动", "Check wallet activity") : ui("查看处理说明", "Review the error")
  };
  if (next) next.textContent = nextLabels[stage];
  appendExecutionEvent(message);
  setStatus(message, kind);
}

function showPostTransactionActions(txHash: string, confirmed = false) {
  const container = document.querySelector<HTMLElement>("#post-transaction-actions");
  const summary = document.querySelector<HTMLElement>("#post-transaction-summary");
  const explorer = document.querySelector<HTMLAnchorElement>("#explorer-link");
  const watch = document.querySelector<HTMLButtonElement>("#watch-asset");
  const watchStatus = document.querySelector<HTMLElement>("#watch-asset-status");
  const url = bscScanTransactionUrl(txHash);
  const display = snapshot?.display as Record<string, unknown> | undefined;
  const request = display ? walletWatchAssetRequest(display) : undefined;
  if (!container || !summary || !explorer || !watch || !url) return;
  submittedTransactionHash = txHash;
  container.hidden = false;
  summary.textContent = confirmed ? ui("BSC 已确认这笔购买", "BSC confirmed this purchase") : ui("MetaMask 已提交这笔购买", "MetaMask submitted this purchase");
  explorer.href = url;
  explorer.textContent = confirmed ? ui("在 BscScan 查看已确认交易", "View confirmed transaction on BscScan") : ui("在 BscScan 查看交易进度", "View transaction progress on BscScan");
  watch.hidden = !request;
  if (request) watch.textContent = ui(`将 ${request.params.options.symbol} 添加到 MetaMask`, `Add ${request.params.options.symbol} to MetaMask`);
  if (watchStatus) watchStatus.textContent = request
    ? ui("添加代币只会让 MetaMask 显示当前股票资产，不会发起交易。", "Adding the token only makes this stock asset visible in MetaMask; it does not start a transaction.")
    : ui("当前计划缺少经过验证的代币元数据，请使用 BscScan 中的合约信息手动添加。", "Verified token metadata is unavailable. Use the contract details on BscScan to add it manually.");
}

async function addPurchasedAssetToMetaMask() {
  const display = snapshot?.display as Record<string, unknown> | undefined;
  const request = display ? walletWatchAssetRequest(display) : undefined;
  const button = document.querySelector<HTMLButtonElement>("#watch-asset");
  const status = document.querySelector<HTMLElement>("#watch-asset-status");
  if (!request || !button || !status) return;
  button.disabled = true;
  status.textContent = ui(`正在请 MetaMask 添加 ${request.params.options.symbol}…`, `Asking MetaMask to add ${request.params.options.symbol}…`);
  try {
    const client = await getMetaMaskClient();
    const accepted = await client.getProvider().request(request);
    status.textContent = accepted === false
      ? ui(`MetaMask 没有添加 ${request.params.options.symbol}。你可以稍后再次选择。`, `MetaMask did not add ${request.params.options.symbol}. You can try again later.`)
      : ui(`${request.params.options.symbol} 已提交给 MetaMask；这不会发起新的交易。`, `${request.params.options.symbol} was submitted to MetaMask; this does not start another transaction.`);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : ui("MetaMask 没有完成代币添加请求。", "MetaMask did not complete the token-add request.");
  } finally {
    button.disabled = false;
  }
}

function escapeText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "Unavailable";
}

function shortTime(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value).toLocaleTimeString() : "time unavailable";
}

function shortAddress(value: unknown): string {
  const text = escapeText(value);
  return /^0x[0-9a-fA-F]{40}$/.test(text) ? `${text.slice(0, 6)}…${text.slice(-4)}` : text;
}

function formatBaseUnits(value: unknown, decimalsValue: unknown): string {
  if (typeof value !== "string" || !/^\d+$/.test(value) || typeof decimalsValue !== "number" || !Number.isInteger(decimalsValue) || decimalsValue < 0 || decimalsValue > 36) return "Unavailable";
  const amount = BigInt(value);
  if (decimalsValue === 0) return amount.toString();
  const scale = 10n ** BigInt(decimalsValue);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimalsValue, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function compactDecimal(value: unknown, maxFractionDigits = 8): string {
  const text = escapeText(value);
  const match = /^(\d+(?:\.\d+)?)(.*)$/.exec(text);
  if (!match) return text;
  const [whole, fraction = ""] = match[1]!.split(".");
  const compactFraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  const compactNumber = compactFraction ? `${whole}.${compactFraction}` : whole!;
  return `${compactNumber}${match[2] ?? ""}`;
}

function setCompactValue(node: HTMLElement | null, value: string, maxFractionDigits = 8) {
  if (!node) return;
  node.textContent = compactDecimal(value, maxFractionDigits);
  node.title = value;
  node.setAttribute("aria-label", value);
}

function decimalToBaseUnits(value: unknown, decimalsValue: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value) || typeof decimalsValue !== "number" || !Number.isInteger(decimalsValue) || decimalsValue < 0 || decimalsValue > 36) return undefined;
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimalsValue) return undefined;
  return (BigInt(whole!) * (10n ** BigInt(decimalsValue)) + BigInt(fraction.padEnd(decimalsValue, "0") || "0")).toString();
}

function outputChangePercent(current: unknown, baseline: unknown): string | undefined {
  if (typeof current !== "string" || !/^\d+$/.test(current) || typeof baseline !== "string" || !/^\d+$/.test(baseline) || BigInt(baseline) <= 0n) return undefined;
  const deltaBps = (BigInt(current) - BigInt(baseline)) * 10_000n / BigInt(baseline);
  const sign = deltaBps > 0n ? "+" : deltaBps < 0n ? "−" : "";
  const absolute = deltaBps < 0n ? -deltaBps : deltaBps;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}%`;
}

function allowanceMetrics(current: unknown, required: unknown): { current: string; required: string; gap: string } | undefined {
  if (typeof current !== "string" || typeof required !== "string" || !/^\d+(?:\.\d+)?$/.test(current) || !/^\d+(?:\.\d+)?$/.test(required)) return undefined;
  const scale = Math.max((current.split(".")[1] ?? "").length, (required.split(".")[1] ?? "").length);
  const units = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole!) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0") || "0");
  };
  const currentUnits = units(current);
  const requiredUnits = units(required);
  const gapUnits = currentUnits >= requiredUnits ? 0n : requiredUnits - currentUnits;
  const formatted = (value: bigint) => {
    if (scale === 0) return value.toString();
    const digits = value.toString().padStart(scale + 1, "0");
    const fraction = digits.slice(-scale).replace(/0+$/, "");
    return fraction ? `${digits.slice(0, -scale)}.${fraction}` : digits.slice(0, -scale);
  };
  return { current, required, gap: formatted(gapUnits) };
}

function renderPlan(value: Record<string, unknown>) {
  const display = value.display as Record<string, unknown> | undefined;
  const request = value.request as Record<string, unknown> | undefined;
  const isPlanReview = value.reviewMode === "purchase_plan";
  const details = document.querySelector<HTMLElement>("#plan");
  if (!details || !display) return;
  const allowance = display.operation === "allowance_approval";
  const title = document.querySelector<HTMLElement>("#portal-title");
  const eyebrow = document.querySelector<HTMLElement>("#portal-eyebrow");
  const lede = document.querySelector<HTMLElement>("#portal-lede");
  const section = document.querySelector<HTMLElement>("#portal-step-label");
  const assetTitle = document.querySelector<HTMLElement>("#asset-title");
  const assetMeta = document.querySelector<HTMLElement>("#asset-meta");
  const assetIdentity = document.querySelector<HTMLElement>("#asset-identity");
  const assetLogo = document.querySelector<HTMLImageElement>("#asset-logo");
  const assetLogoFallback = document.querySelector<HTMLElement>("#asset-logo-fallback");
  const issuerLogo = document.querySelector<HTMLImageElement>("#issuer-logo");
  const marketSymbol = document.querySelector<HTMLElement>("#market-symbol");
  if (isPlanReview) {
    if (title) title.textContent = ui("沿着这条线，继续你的买入", "Continue this purchase intent");
    if (eyebrow) eyebrow.textContent = ui("同一份 BSC 买入计划", "One BSC purchase intent");
    if (lede) lede.textContent = ui("原计划不会因报价更新而消失。Ariadne 会继续沿用同一钱包、标的、金额和限制，对照 Binance Web3 的最新行情与执行报价。", "Quote updates do not erase your intent. Ariadne keeps the same wallet, asset, amount and limits while comparing current Binance Web3 market and execution data.");
    if (section) section.textContent = ui("原计划基准 → 最新执行报价", "Intent baseline → Current execution quote");
  } else if (allowance) {
    if (title) title.textContent = ui("一次计划，沿线完成两次确认", "One intent, two wallet confirmations");
    if (eyebrow) eyebrow.textContent = ui("一次购买 · 两次钱包确认", "One purchase · Two wallet confirmations");
    if (lede) lede.textContent = ui("先在 MetaMask 确认 USDT 授权。链上确认后，同一页面会继续核对行情和计划边界，再呈现独立的股票买入确认。", "Confirm the exact USDT allowance first. After BSC confirms it, this page checks the market and intent boundaries again before presenting the separate stock purchase.");
    if (section) section.textContent = ui("01 · USDT 授权 → 02 · 股票买入", "01 · USDT allowance → 02 · Stock purchase");
  } else {
    if (title) title.textContent = ui("计划已走到钱包，由你完成确认", "Your plan is ready for wallet confirmation");
    if (eyebrow) eyebrow.textContent = ui("已复核的 BSC 股票买入", "Reviewed BSC stock purchase");
    if (lede) lede.textContent = ui("Ariadne 已按同一份计划准备好交易。请在 MetaMask 中复核；只有 BSC 确认并完成余额核对后，页面才会报告成功。", "Ariadne prepared the transaction for this intent. Review it in MetaMask; success is reported only after BSC finality and balance reconciliation.");
    if (section) section.textContent = ui("股票买入确认", "Stock purchase confirmation");
  }
  const baseline = display.marketBaseline as Record<string, unknown> | undefined;
  const purchaseBaseline = display.purchaseBaseline as Record<string, unknown> | undefined;
  const showQuoteBaseline = isPlanReview || typeof display.continuationOfPlanId === "string";
  const outputSymbol = escapeText(display.outputSymbol);
  const inputAmount = allowance ? `授权上限 ${escapeText(display.inputAmount)} ${escapeText(display.inputSymbol)}` : `${escapeText(display.inputAmount)} ${escapeText(display.inputSymbol)}`;
  const originalExpected = purchaseBaseline
    ? formatBaseUnits(purchaseBaseline.expectedOutput, purchaseBaseline.outputDecimals)
    : "—";
  const currentExpected = allowance
    ? originalExpected
    : escapeText(display.expectedOutput);
  const currentChange = !allowance && purchaseBaseline
    ? outputChangePercent(decimalToBaseUnits(display.expectedOutput, purchaseBaseline.outputDecimals), purchaseBaseline.expectedOutput) ?? "无法比较"
    : "沿用原计划基准";
  const expectedNode = document.querySelector<HTMLElement>("#plan-output");
  const baselineOutputNode = document.querySelector<HTMLElement>("#baseline-output");
  const amountNode = document.querySelector<HTMLElement>("#plan-amount");
  const currencyNode = document.querySelector<HTMLElement>("#plan-currency");
  const outputChangeNode = document.querySelector<HTMLElement>("#output-change");
  const minimumNode = document.querySelector<HTMLElement>("#plan-minimum");
  const slippageNode = document.querySelector<HTMLElement>("#slippage-cap");
  const heroAmountNode = document.querySelector<HTMLElement>("#hero-amount");
  const heroCurrencyNode = document.querySelector<HTMLElement>("#hero-currency");
  const orderAmountNode = document.querySelector<HTMLElement>("#order-amount");
  const orderCurrencyNode = document.querySelector<HTMLElement>("#order-currency");
  const orderOutputNode = document.querySelector<HTMLElement>("#order-output");
  const orderMinimumNode = document.querySelector<HTMLElement>("#order-minimum");
  const networkFeeNode = document.querySelector<HTMLElement>("#network-fee");
  const baselineMinimumNode = document.querySelector<HTMLElement>("#baseline-minimum");
  const baselineNetworkFeeNode = document.querySelector<HTMLElement>("#baseline-network-fee");
  const networkFeeChangeNode = document.querySelector<HTMLElement>("#network-fee-change");
  const routeFeeNode = document.querySelector<HTMLElement>("#route-fee");
  if (assetTitle) assetTitle.textContent = escapeText(display.underlyingName ?? display.ticker);
  if (assetMeta) assetMeta.textContent = `${escapeText(display.issuer)} · ${outputSymbol}`;
  if (assetIdentity) assetIdentity.textContent = `${escapeText(display.ticker)} · ${escapeText(display.issuer)} · ${outputSymbol}`;
  const officialUnderlyingLogo = OFFICIAL_UNDERLYING_LOGOS[escapeText(display.ticker).toUpperCase()];
  const providerTokenLogo = typeof display.tokenLogoUrl === "string" ? display.tokenLogoUrl : undefined;
  const primaryAssetLogo = officialUnderlyingLogo ?? providerTokenLogo;
  if (assetLogo && primaryAssetLogo) {
    assetLogo.src = primaryAssetLogo;
    assetLogo.alt = `${escapeText(display.underlyingName ?? display.ticker)} ${ui("官方资产标志", "official asset mark")}`;
    assetLogo.hidden = false;
    if (assetLogoFallback) assetLogoFallback.hidden = true;
    assetLogo.addEventListener("error", () => {
      if (providerTokenLogo && providerTokenLogo !== primaryAssetLogo) {
        assetLogo.src = providerTokenLogo;
        assetLogo.addEventListener("error", () => {
          assetLogo.hidden = true;
          if (assetLogoFallback) assetLogoFallback.hidden = false;
        }, { once: true });
        return;
      }
      assetLogo.hidden = true;
      if (assetLogoFallback) assetLogoFallback.hidden = false;
    }, { once: true });
  }
  if (issuerLogo && typeof display.issuerLogoUrl === "string") {
    issuerLogo.src = display.issuerLogoUrl;
    issuerLogo.alt = `${escapeText(display.issuer)} ${ui("发行方标志", "issuer mark")}`;
    issuerLogo.hidden = false;
  }
  if (marketSymbol) marketSymbol.textContent = outputSymbol;
  if (amountNode) amountNode.textContent = escapeText(display.inputAmount);
  if (currencyNode) currencyNode.textContent = `${escapeText(display.inputSymbol)} ${ui("买入", "purchase")}`;
  if (heroAmountNode) heroAmountNode.textContent = escapeText(display.inputAmount);
  if (heroCurrencyNode) heroCurrencyNode.textContent = `${escapeText(display.inputSymbol)} ${ui("买入", "purchase")}`;
  if (orderAmountNode) orderAmountNode.textContent = escapeText(display.inputAmount);
  if (orderCurrencyNode) orderCurrencyNode.textContent = escapeText(display.inputSymbol);
  setCompactValue(baselineOutputNode, `${compactDecimal(originalExpected)} ${outputSymbol}`);
  setCompactValue(expectedNode, `${compactDecimal(currentExpected)} ${outputSymbol}`);
  if (orderOutputNode) orderOutputNode.textContent = `${currentExpected} ${outputSymbol}`;
  if (outputChangeNode) outputChangeNode.textContent = currentChange;
  const minimumText = allowance
    ? `${formatBaseUnits(purchaseBaseline?.minimumOutput, purchaseBaseline?.outputDecimals)} ${outputSymbol}`
    : `${escapeText(display.minimumOutput)} ${outputSymbol}`;
  const baselineMinimumText = purchaseBaseline
    ? `${formatBaseUnits(purchaseBaseline.minimumOutput, purchaseBaseline.outputDecimals)} ${outputSymbol}`
    : minimumText;
  if (minimumNode) minimumNode.textContent = minimumText;
  setCompactValue(baselineMinimumNode, baselineMinimumText);
  setCompactValue(orderMinimumNode, minimumText);
  const executionRequestNode = document.querySelector<HTMLElement>("#execution-request");
  const executionWalletNode = document.querySelector<HTMLElement>("#execution-wallet");
  const executionBoundaryNode = document.querySelector<HTMLElement>("#execution-boundary");
  const allowanceCurrentNode = document.querySelector<HTMLElement>("#execution-allowance-current");
  const allowanceRequiredNode = document.querySelector<HTMLElement>("#execution-allowance-required");
  const allowanceStateNode = document.querySelector<HTMLElement>("#execution-allowance-state");
  const allowanceGapNode = document.querySelector<HTMLElement>("#execution-gap");
  if (executionRequestNode) executionRequestNode.textContent = allowance
    ? `${escapeText(display.issuer)} · ${ui("授权", "allow")} ${escapeText(display.inputSymbol)}`
    : `${escapeText(display.issuer)} · ${outputSymbol}`;
  if (executionWalletNode) executionWalletNode.textContent = `${escapeText(value.account).slice(0, 6)}…${escapeText(value.account).slice(-4)}`;
  if (executionBoundaryNode) executionBoundaryNode.textContent = `${ui("滑点", "Slippage")} ≤ ${(Number(display.slippageBps) / 100).toFixed(2)}%`;
  const allowanceCurrent = typeof display.allowanceCurrent === "string" ? display.allowanceCurrent : undefined;
  const allowanceRequired = typeof display.allowanceRequired === "string" ? display.allowanceRequired : escapeText(display.inputAmount);
  const allowanceProgress = allowanceMetrics(allowanceCurrent, allowanceRequired);
  if (allowanceCurrentNode) allowanceCurrentNode.textContent = allowanceProgress?.current ?? "—";
  if (allowanceRequiredNode) allowanceRequiredNode.textContent = `/ ${allowanceProgress?.required ?? allowanceRequired} ${escapeText(display.inputSymbol)}`;
  if (allowanceStateNode) allowanceStateNode.textContent = display.allowanceStatus === "sufficient" ? ui("额度充足", "Sufficient") : display.allowanceStatus === "insufficient" ? ui("存在缺口", "Shortfall") : ui("尚未核实", "Unverified");
  if (allowanceGapNode) allowanceGapNode.textContent = allowanceProgress ? (allowanceProgress.gap === "0" ? ui("已满足", "Covered") : `${allowanceProgress.gap} ${escapeText(display.inputSymbol)}`) : ui("待核实", "Pending");
  if (slippageNode) slippageNode.textContent = `${(Number(display.slippageBps) / 100).toFixed(2)}%`;
  const currentNetworkFee = typeof display.estimatedNetworkFeeBnb === "string" ? display.estimatedNetworkFeeBnb : undefined;
  const baselineNetworkFee = typeof purchaseBaseline?.estimatedNetworkFeeBnb === "string" ? purchaseBaseline.estimatedNetworkFeeBnb : undefined;
  if (networkFeeNode) setCompactValue(networkFeeNode, currentNetworkFee
    ? `${currentNetworkFee} BNB`
    : allowance
      ? `≤ ${escapeText(display.maxGasCostBnb)} BNB`
      : ui("本次未能估算", "Unavailable"), 10);
  if (baselineNetworkFeeNode) setCompactValue(baselineNetworkFeeNode, baselineNetworkFee ? `${baselineNetworkFee} BNB` : ui("原计划未提供", "Not available in intent"), 10);
  const networkFeeChange = currentNetworkFee && baselineNetworkFee
    ? outputChangePercent(decimalToBaseUnits(currentNetworkFee, 18), decimalToBaseUnits(baselineNetworkFee, 18)) ?? "无法比较"
    : ui("无法比较", "Unavailable");
  if (networkFeeChangeNode) {
    networkFeeChangeNode.textContent = networkFeeChange;
    networkFeeChangeNode.dataset.direction = networkFeeChange.startsWith("+") ? "up" : networkFeeChange.startsWith("−") ? "down" : "unknown";
  }
  if (routeFeeNode) routeFeeNode.textContent = typeof display.routeFeeUsd === "string" ? `${compactDecimal(display.routeFeeUsd, 4)} USD` : ui("未提供", "Unavailable");
  if (outputChangeNode) {
    outputChangeNode.dataset.direction = currentChange.startsWith("+") ? "up" : currentChange.startsWith("−") ? "down" : "unknown";
  }
  const baselineNote = document.querySelector<HTMLElement>("#baseline-output-note");
  if (baselineNote) baselineNote.textContent = allowance ? ui("授权后会复核同一份计划", "Intent is rechecked after allowance") : ui("计划确认时", "At intent confirmation");
  if (amountNode) amountNode.setAttribute("aria-label", inputAmount);
  void renderChartForToken(display);
  const rows: Array<[string, unknown]> = allowance ? [
    ["本次授权", `允许使用 ${escapeText(display.inputAmount)} ${escapeText(display.inputSymbol)}`],
    ["确认的买入计划", `${escapeText(display.inputAmount)} ${escapeText(display.inputSymbol)} → ${escapeText(display.ticker)} · ${escapeText(display.outputSymbol)}`],
    ["计划预计到账", purchaseBaseline ? `${formatBaseUnits(purchaseBaseline.expectedOutput, purchaseBaseline.outputDecimals)} ${escapeText(display.outputSymbol)}` : "原计划未提供，不能自动继续"],
    ["原计划最低到账", purchaseBaseline ? `${formatBaseUnits(purchaseBaseline.minimumOutput, purchaseBaseline.outputDecimals)} ${escapeText(display.outputSymbol)}` : "无法读取，不能自动继续"],
    ["USDT 合约", escapeText(display.inputContract)],
    ["授权对象", escapeText(display.spender)],
    ["钱包地址", escapeText(value.account)],
    ["授权网络费上限", `${escapeText(display.maxGasCostBnb)} BNB`],
    ["买入滑点上限", `${(Number(display.slippageBps) / 100).toFixed(2)}%`],
    ["买入网络费上限", `${escapeText(display.purchaseMaxGasCostBnb ?? display.maxGasCostBnb)} BNB`],
    ["市场状态", escapeText(display.marketStatus)],
    ...(baseline?.tokenPrice ? [["计划基准行情", `${escapeText(baseline.tokenPrice)} · ${shortTime(Number(baseline.tokenPriceUpdatedAt))}`] as [string, unknown]] : []),
    ...(typeof display.marketCaveat === "string" ? [["市场说明", display.marketCaveat] as [string, unknown]] : []),
    ["授权请求有效期", new Date(Number(value.expiresAt)).toLocaleString()]
  ] : [
    ["买入金额", `${escapeText(display.inputAmount)} ${escapeText(display.inputSymbol)}`],
    ...(showQuoteBaseline && purchaseBaseline ? [["原计划预计到账", `${formatBaseUnits(purchaseBaseline.expectedOutput, purchaseBaseline.outputDecimals)} ${escapeText(display.outputSymbol)}`] as [string, unknown]] : []),
    [showQuoteBaseline ? "最新报价预计到账" : "预计到账", `${escapeText(display.expectedOutput)} ${escapeText(display.outputSymbol)}`],
    ...(showQuoteBaseline && purchaseBaseline ? [["预计到账变化", outputChangePercent(decimalToBaseUnits(display.expectedOutput, purchaseBaseline.outputDecimals), purchaseBaseline.expectedOutput) ?? "无法比较"] as [string, unknown]] : []),
    ...(showQuoteBaseline && purchaseBaseline ? [["原计划最低到账", `${formatBaseUnits(purchaseBaseline.minimumOutput, purchaseBaseline.outputDecimals)} ${escapeText(display.outputSymbol)}`] as [string, unknown]] : []),
    [showQuoteBaseline ? "本次最低到账" : "最低到账", `${escapeText(display.minimumOutput)} ${escapeText(display.outputSymbol)}`],
    ...(showQuoteBaseline && purchaseBaseline ? [["原计划预估网络费", purchaseBaseline.estimatedNetworkFeeBnb ? `${escapeText(purchaseBaseline.estimatedNetworkFeeBnb)} BNB` : "原计划未提供估算"] as [string, unknown]] : []),
    ...(showQuoteBaseline ? [["本次预估网络费", typeof display.estimatedNetworkFeeBnb === "string" ? `${escapeText(display.estimatedNetworkFeeBnb)} BNB` : "本次未能估算"] as [string, unknown]] : []),
    ...(showQuoteBaseline && purchaseBaseline ? [["网络费变化", typeof display.estimatedNetworkFeeBnb === "string" && typeof purchaseBaseline.estimatedNetworkFeeBnb === "string"
      ? outputChangePercent(decimalToBaseUnits(display.estimatedNetworkFeeBnb, 18), decimalToBaseUnits(purchaseBaseline.estimatedNetworkFeeBnb, 18)) ?? "无法比较"
      : "无法比较"] as [string, unknown]] : []),
    ...(showQuoteBaseline && purchaseBaseline ? [["原计划路由费用", typeof purchaseBaseline.routeFeeUsd === "string" ? `${escapeText(purchaseBaseline.routeFeeUsd)} USD` : "原计划未提供"] as [string, unknown]] : []),
    ...(showQuoteBaseline ? [["本次路由费用", typeof display.routeFeeUsd === "string" ? `${escapeText(display.routeFeeUsd)} USD` : "本次未提供"] as [string, unknown]] : []),
    ...(showQuoteBaseline && purchaseBaseline ? [["路由费用变化", typeof display.routeFeeUsd === "string" && typeof purchaseBaseline.routeFeeUsd === "string"
      ? outputChangePercent(decimalToBaseUnits(display.routeFeeUsd, 6), decimalToBaseUnits(purchaseBaseline.routeFeeUsd, 6)) ?? "无法比较"
      : "无法比较"] as [string, unknown]] : []),
    ["发行方与标的", `${escapeText(display.issuer)} · ${escapeText(display.ticker)}`],
    ["付款代币合约", escapeText(display.inputContract)],
    ["股票代币合约", escapeText(display.outputContract)],
    ["钱包地址", escapeText(value.account)],
    ["交易目标合约", request && typeof request.to === "string" ? escapeText(request.to) : "等待最新执行报价"],
    ["代币授权对象", escapeText(display.spender)],
    ["最大滑点", `${(Number(display.slippageBps) / 100).toFixed(2)}%`],
    ["网络费上限", `${escapeText(display.maxGasCostBnb)} BNB`],
    ["市场状态", escapeText(display.marketStatus)],
    ...(typeof display.routeFeeUsd === "string" ? [["预计路由费用", `${display.routeFeeUsd} USD`] as [string, unknown]] : []),
    ...(typeof display.marketCaveat === "string" ? [["市场说明", display.marketCaveat] as [string, unknown]] : []),
    ...(isPlanReview ? [["当前报价有效期", new Date(Number(value.quoteExpiresAt ?? 0)).toLocaleString()] as [string, unknown]] : [["计划有效期", new Date(Number(value.quoteExpiresAt ?? value.expiresAt)).toLocaleString()] as [string, unknown]])
  ];
  const englishLabels: Record<string, string> = {
    "本次授权": "This allowance", "确认的买入计划": "Confirmed purchase intent", "计划预计到账": "Intent expected output",
    "原计划最低到账": "Intent minimum output", "USDT 合约": "USDT contract", "授权对象": "Approved spender", "钱包地址": "Wallet account",
    "授权网络费上限": "Allowance network-fee maximum", "买入滑点上限": "Purchase max slippage", "买入网络费上限": "Purchase network-fee maximum",
    "市场状态": "Market status", "计划基准行情": "Intent market baseline", "市场说明": "Market caveat", "授权请求有效期": "Allowance request expiry",
    "买入金额": "Purchase amount", "原计划预计到账": "Intent expected output", "最新报价预计到账": "Current quote expected output",
    "预计到账": "Expected output", "预计到账变化": "Expected output change", "本次最低到账": "Current minimum output", "最低到账": "Minimum output",
    "原计划预估网络费": "Intent network-fee estimate", "本次预估网络费": "Current network-fee estimate", "网络费变化": "Network-fee change",
    "原计划路由费用": "Intent route fee", "本次路由费用": "Current route fee", "路由费用变化": "Route-fee change",
    "发行方与标的": "Issuer and asset", "付款代币合约": "Payment token contract", "股票代币合约": "Stock token contract",
    "交易目标合约": "Transaction target", "代币授权对象": "Token spender", "最大滑点": "Max slippage", "网络费上限": "Network-fee maximum",
    "预计路由费用": "Estimated route fee", "当前报价有效期": "Current quote expiry", "计划有效期": "Intent expiry"
  };
  details.replaceChildren(...rows.map(([label, content]) => {
    const row = document.createElement("div");
    row.className = "plan-row";
    const titleNode = document.createElement("dt");
    titleNode.textContent = pageLanguage === "en" ? englishLabels[label] ?? label : label;
    const description = document.createElement("dd");
    description.textContent = escapeText(content);
    row.append(titleNode, description);
    return row;
  }));
  renderQuoteDecision();
  updateMarketPanel(latestMarket);
  const currentPlanId = typeof value.planId === "string" ? value.planId : handoffId;
  if (currentPlanId && currentPlanId !== lastRenderedPlanId) {
    lastRenderedPlanId = currentPlanId;
    appendExecutionEvent(allowance ? "已载入同一购买计划的 USDT 授权步骤" : `已载入 ${escapeText(display.issuer)} ${outputSymbol} 购买计划`);
  }
  root.classList.add("is-loaded");
}

function setChartFallback(message: string) {
  const canvas = document.querySelector<HTMLElement>("#market-chart");
  const fallback = document.querySelector<HTMLElement>("#chart-fallback");
  const status = document.querySelector<HTMLElement>("#chart-status");
  if (canvas) canvas.hidden = true;
  if (fallback) {
    fallback.hidden = false;
    fallback.textContent = message;
  }
  if (status) status.textContent = "K 线当前不可用";
}

function ensureChart() {
  const canvas = document.querySelector<HTMLElement>("#market-chart");
  if (!canvas) return undefined;
  canvas.hidden = false;
  document.querySelector<HTMLElement>("#chart-fallback")?.setAttribute("hidden", "");
  if (!chartContext) {
    const chart = createChart(canvas, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "#090909" }, textColor: "#99938b", fontFamily: "Manrope, system-ui, sans-serif", fontSize: 11, attributionLogo: true },
      grid: { vertLines: { color: "#ffffff0d" }, horzLines: { color: "#ffffff0d" } },
      crosshair: { mode: CrosshairMode.MagnetOHLC, vertLine: { color: "#db4d3666", labelBackgroundColor: "#a93627" }, horzLine: { color: "#db4d3666", labelBackgroundColor: "#a93627" } },
      rightPriceScale: { borderColor: "#ffffff1a", scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: { borderColor: "#ffffff1a", timeVisible: true, secondsVisible: false, rightOffset: 4 },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: false, pinch: true },
      localization: { locale: document.documentElement.lang === "en" ? "en-US" : "zh-CN" }
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#91c7a0", downColor: "#f08067", borderUpColor: "#91c7a0", borderDownColor: "#f08067",
      wickUpColor: "#91c7a0", wickDownColor: "#f08067", priceLineVisible: true, lastValueVisible: true,
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 }
    });
    chartContext = { chart, series };
  }
  return chartContext;
}

async function refreshChartData(fitContent = false) {
  if (!handoffId || !capability || chartRefreshInFlight) return;
  chartRefreshInFlight = true;
  const status = document.querySelector<HTMLElement>("#chart-status");
  try {
    const query = new URLSearchParams({ interval: currentChartInterval, limit: "100" });
    const data = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/candles?${query}`) as MarketCandles;
    const candles = Array.isArray(data.candles) ? data.candles.filter((row) => row && Number.isSafeInteger(row.time) && row.time > 0 &&
      [row.open, row.high, row.low, row.close].every((price) => Number.isFinite(price) && price > 0)) : [];
    if (data.state !== "available" || !candles.length) {
      setChartFallback("Binance Web3 暂未返回这项 BSC 代币的 K 线数据；页面不会用其他标的或模拟数据补上。");
      return;
    }
    const state = ensureChart();
    if (!state) return;
    const points = candles.map((row) => ({
      time: row.time as UTCTimestamp,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close
    })) satisfies CandlestickData<UTCTimestamp>[];
    state.series.setData(points);
    if (!chartDataLoaded || fitContent) state.chart.timeScale().fitContent();
    chartDataLoaded = true;
    const intervalLabel: Record<string, string> = { "1m": "1 分钟", "5m": "5 分钟", "15m": "15 分钟", "1h": "1 小时", "4h": "4 小时", "12h": "12 小时", "1d": "1 天" };
    const timestamp = new Date(candles[candles.length - 1]!.time * 1_000).toLocaleTimeString();
    if (status) status.textContent = `Binance Web3 · ${intervalLabel[currentChartInterval] ?? currentChartInterval} K 线 · ${candles.length} 根 · 最新柱 ${timestamp} · 每 15 秒检查更新`;
    document.querySelector<HTMLElement>("#chart-fallback")?.setAttribute("hidden", "");
  } catch {
    if (chartDataLoaded) {
      if (status) status.textContent = "暂时无法刷新 Binance Web3 K 线；图表保留上次成功读取的数据。";
    } else {
      setChartFallback("暂时无法读取 Binance Web3 K 线；请稍后重试。不会显示模拟行情。");
    }
  } finally {
    chartRefreshInFlight = false;
  }
}

async function renderChartForToken(display: Record<string, unknown>) {
  const block = document.querySelector<HTMLElement>("#chart-block");
  const marketReference = display.marketReference as Record<string, unknown> | undefined;
  const contract = typeof display.outputContract === "string" ? display.outputContract.toLowerCase() : "";
  const exactBscIdentity = marketReference?.chainId === "56" && typeof marketReference.platformId === "string" && marketReference.platformId.length > 0 &&
    typeof marketReference.contractAddress === "string" && marketReference.contractAddress.toLowerCase() === contract;
  if (!block || !exactBscIdentity) {
    if (block) block.hidden = true;
    return;
  }
  block.hidden = false;
  document.querySelector<HTMLElement>("#chart-fallback")?.removeAttribute("hidden");
  const canvas = document.querySelector<HTMLElement>("#market-chart");
  if (canvas) canvas.hidden = true;
  const intervalButtons = document.querySelectorAll<HTMLButtonElement>("[data-chart-interval]");
  if (!chartControlsBound) {
    chartControlsBound = true;
    intervalButtons.forEach((button) => button.addEventListener("click", () => {
      const interval = button.dataset.chartInterval;
      if (!interval || interval === currentChartInterval) return;
      currentChartInterval = interval;
      chartDataLoaded = false;
      intervalButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      const fallback = document.querySelector<HTMLElement>("#chart-fallback");
      if (fallback) { fallback.hidden = false; fallback.textContent = "正在读取所选周期的 Binance Web3 K 线…"; }
      if (canvas) canvas.hidden = true;
      void refreshChartData(true);
    }));
  }
  if (chartRefreshTimer !== undefined) window.clearInterval(chartRefreshTimer);
  void refreshChartData(true);
  chartRefreshTimer = window.setInterval(() => {
    if (!document.hidden) void refreshChartData(false);
  }, 15_000);
}

function renderQuoteDecision() {
  const container = document.querySelector<HTMLElement>("#quote-decision");
  if (!container) return;
  container.replaceChildren();
  if (!snapshot || snapshot.requiresQuoteAcceptance !== true) return;
  const driftBps = typeof snapshot.quoteDriftBps === "number" ? snapshot.quoteDriftBps : undefined;
  const note = document.createElement("p");
  note.textContent = `最新报价的预计到账比原计划少${driftBps === undefined ? "，且无法计算差异" : `约 ${(driftBps / 100).toFixed(2)}%`}，超过原计划的滑点上限。页面没有发起钱包请求；请先看清上方的新旧计划差异。`;
  const button = document.createElement("button");
  button.className = "quote-accept";
  button.type = "button";
  button.textContent = "我已看过变化，继续用此报价打开 MetaMask";
  button.addEventListener("click", async () => {
    const quoteId = typeof snapshot?.pendingQuoteId === "string" ? snapshot.pendingQuoteId : "";
    if (!quoteId) { setStatus("找不到待确认的最新报价，请刷新当前计划。", "error"); return; }
    button.disabled = true;
    setStatus("正在确认你选择的最新报价…");
    try {
      snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/accept-purchase-quote`, {
        method: "POST", body: JSON.stringify({ quoteId })
      });
      renderPlan(snapshot);
      walletAttemptId = crypto.randomUUID();
      await runWalletFlow();
    } catch (error) {
      button.disabled = false;
      setStatus(error instanceof Error ? error.message : "无法确认当前报价；没有请求钱包操作。", "error");
    }
  });
  container.append(note, button);
}

function updateMarketPanel(update: MarketSnapshot | undefined) {
  const display = snapshot?.display as Record<string, unknown> | undefined;
  const baseline = display?.marketBaseline as Record<string, unknown> | undefined;
  const baselinePrice = typeof baseline?.tokenPrice === "string" ? Number(baseline.tokenPrice) : undefined;
  const livePrice = update?.state === "available" && typeof update.tokenPrice === "string" ? Number(update.tokenPrice) : undefined;
  const baseNode = document.querySelector<HTMLElement>("#baseline-price");
  const currentNode = document.querySelector<HTMLElement>("#current-price");
  const deltaNode = document.querySelector<HTMLElement>("#price-delta");
  const referenceNode = document.querySelector<HTMLElement>("#reference-price");
  const updatedNode = document.querySelector<HTMLElement>("#market-updated");
  const marketTimeNode = document.querySelector<HTMLElement>("#market-time");
  const baselineTimeNode = document.querySelector<HTMLElement>("#baseline-time");
  if (baselineTimeNode) baselineTimeNode.textContent = baseline?.tokenPriceUpdatedAt
    ? `原计划行情 · ${shortTime(Number(baseline.tokenPriceUpdatedAt))}`
    : "原计划行情时间不可用";
  if (baseNode) baseNode.textContent = baselinePrice && baselinePrice > 0 ? baselinePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : "—";
  if (currentNode && livePrice && livePrice > 0) {
    const formatted = livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    if (currentNode.textContent !== formatted) {
      currentNode.textContent = formatted;
      currentNode.classList.remove("price-flash");
      requestAnimationFrame(() => currentNode.classList.add("price-flash"));
    }
  } else if (currentNode && !latestMarket?.tokenPrice) currentNode.textContent = "正在读取";
  if (deltaNode) {
    if (baselinePrice && baselinePrice > 0 && livePrice && livePrice > 0) {
      const delta = (livePrice / baselinePrice - 1) * 100;
      deltaNode.textContent = `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}%`;
      deltaNode.dataset.direction = delta >= 0 ? "up" : "down";
    } else {
      deltaNode.textContent = baselinePrice ? "等待最新快照" : "原计划基准价不可用";
      deltaNode.dataset.direction = "unknown";
    }
  }
  if (referenceNode) referenceNode.textContent = update?.referencePrice ? Number(update.referencePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : "—";
  if (updatedNode) {
    const at = update?.tokenPriceUpdatedAt;
    const age = typeof at === "number" ? Math.max(0, Math.floor((Date.now() - at) / 1_000)) : undefined;
    const available = update?.state === "available" && age !== undefined;
    updatedNode.textContent = available
      ? `Binance Web3 已读取快照 · ${shortTime(at)} · ${age} 秒前更新${age > 120 ? " · 数据较旧" : ""}`
      : "Binance Web3 暂无可用行情；不会用模拟价格填充";
  }
  if (marketTimeNode && update?.state === "available" && typeof update.tokenPriceUpdatedAt === "number") {
    const age = Math.max(0, Math.floor((Date.now() - update.tokenPriceUpdatedAt) / 1_000));
    marketTimeNode.textContent = `${age} 秒前 · 快照读取中`;
  } else if (marketTimeNode) {
    marketTimeNode.textContent = "等待 Binance Web3 快照";
  }
}

async function relay(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    ...init,
    headers: { authorization: `Bearer ${capability}`, "content-type": "application/json", ...init.headers }
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Approval relay returned ${response.status}`);
  return data;
}

async function reportClientStage(stage: ClientStage, detail?: string) {
  setDiagnosticStage(`${stage.replaceAll("_", " ").toUpperCase()}${detail ? ` · ${detail}` : ""}`);
  if (!handoffId || !capability) return;
  try {
    snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/client-stage`, {
      method: "POST", body: JSON.stringify({ stage, detail })
    });
  } catch {
    // The visible stage remains useful even if the local relay cannot persist diagnostics.
  }
}

async function reportClientFailure(stage: "quote_refresh" | "quote_boundary" | "wallet_discovery" | "wallet_connection" | "wallet_preflight" | "page_runtime", reason: string) {
  if (!handoffId || !capability) return;
  try {
    snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/client-failure`, {
      method: "POST", body: JSON.stringify({ stage, reason })
    });
  } catch {
    // Keep the visible failure. The Agent monitor can still observe any server-side terminalization.
  }
}

async function updateMarketUntilDone() {
  if (marketLoopStarted) return;
  marketLoopStarted = true;
  while (handoffId && !["confirmed", "failed", "wallet_rejected", "wallet_uncertain", "expired"].includes(String(snapshot?.state))) {
    try {
      const data = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/market`) as MarketSnapshot;
      latestMarket = data;
      // Binance Web3 returns point-in-time snapshots here, not chart history.
      updateMarketPanel(latestMarket);
    } catch {
      latestMarket = { state: "unavailable" };
      updateMarketPanel(latestMarket);
    }
    await new Promise((resolve) => window.setTimeout(resolve, document.hidden ? 12_000 : 5_000));
  }
}

async function discoverWallet(): Promise<{ provider: Eip1193WalletProvider; source: string }> {
  const walletWindow = window as PortalWindow;
  const announcements: AnnouncedEip1193Provider[] = [];
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<AnnouncedEip1193Provider>).detail;
    if (detail?.provider) announcements.push(detail);
  };
  window.addEventListener("eip6963:announceProvider", listener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // Give EIP-6963 providers time to identify themselves before considering the
  // legacy injection surface. This page explicitly targets MetaMask and must
  // never treat an arbitrary singleton provider as MetaMask.
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  window.removeEventListener("eip6963:announceProvider", listener);
  const selection = selectMetaMaskProvider({
    injectedProvider: walletWindow.ethereum,
    injectedProviders: walletWindow.ethereum?.providers,
    announcements
  });
  if (selection.status === "ambiguous") throw new Error("检测到多个钱包，但无法唯一识别 MetaMask；没有发送交易请求。请停用冲突的钱包扩展后重试。");
  if (selection.status === "none") throw new Error("这个浏览器页面没有检测到 MetaMask；没有发送交易请求。");
  const announced = announcements.find((item) => item.provider === selection.provider && item.info?.rdns?.toLowerCase() === "io.metamask");
  return { provider: selection.provider, source: announced ? "io.metamask" : "legacy:isMetaMask" };
}

async function reportWalletResult(body: Record<string, unknown>) {
  snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/submission`, { method: "POST", body: JSON.stringify(body) });
}

async function getMetaMaskClient(): Promise<MetamaskConnectEVM> {
  if (metaMaskClient) return metaMaskClient;
  metaMaskClient = await createEVMClient({
    dapp: { name: "Ariadne", url: window.location.origin },
    api: { supportedNetworks: { "0x38": "https://bsc-dataseed.binance.org" } },
    analytics: { enabled: false },
    ui: { headless: true, preferExtension: true, showInstallModal: false },
    transport: { extensionId: "nkbihfbeogaeaoehlefnkodbefgpgknn" },
    skipAutoAnnounce: true
  });
  return metaMaskClient;
}

async function runWalletFlow() {
  if (walletAttemptStarted || !snapshot || snapshot.state !== "active") return;
  if (!snapshot.request || typeof snapshot.request !== "object") {
    setStatus("还没有准备好最新的钱包请求；当前没有发起钱包操作。", "error");
    return;
  }
  if (snapshot.walletAttemptClaimedAt !== undefined && !walletAttemptClaimedByThisPage) {
    setStatus("This exact wallet request has already been attempted in another page. Return to Ariadne and inspect its status before preparing a new plan.", "error");
    return;
  }
  walletAttemptStarted = true;
  const isAllowance = (snapshot.display as Record<string, unknown> | undefined)?.operation === "allowance_approval";
  setWalletStage("wallet", "正在查找此浏览器中的钱包…");
  await reportClientStage("provider_discovery_started");
  const selected = await discoverWallet();
  await reportClientStage("provider_selected", selected.source);
  const client = await getMetaMaskClient();
  const reviewedAccount = String(snapshot.account);
  setWalletStage("request", `正在通过 MetaMask 的单次流程连接计划账户并显示${isAllowance ? "USDT 授权" : "股票买入"}确认…`);
  snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/attempt`, {
    method: "POST", body: JSON.stringify({ attemptId: walletAttemptId })
  });
  walletAttemptClaimedByThisPage = true;
  await reportClientStage("connect_execute_started", `${reviewedAccount.slice(0, 6)}…${reviewedAccount.slice(-4)} · BSC`);
  await reportClientStage("transaction_request_started", isAllowance ? "USDT allowance" : "stock purchase");
  walletTransactionCallStarted = true;
  connectExecutePending = true;
  const request = snapshot.request as Record<string, unknown>;
  const connected = await client.connectWith({
    method: "eth_sendTransaction",
    account: reviewedAccount,
    chainIds: ["0x38"],
    params: (account) => {
      if (account.toLowerCase() !== reviewedAccount.toLowerCase()) {
        throw new Error("MetaMask selected an account that does not match this reviewed purchase plan.");
      }
      return [{ ...request, from: account }];
    }
  }).finally(() => {
    connectExecutePending = false;
  });
  const account = connected.accounts.find((value) => value.toLowerCase() === reviewedAccount.toLowerCase());
  const chainId = connected.chainId;
  if (!account || chainId.toLowerCase() !== "0x38") throw new Error("MetaMask account or network does not match this reviewed BSC purchase plan.");
  const txHash = connected.result;
  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("The wallet did not return a valid transaction hash.");
  await reportClientStage("account_ready", `${account.slice(0, 6)}…${account.slice(-4)} · BSC`);
  await reportClientStage("connect_execute_resolved", txHash.slice(0, 12));
  await reportClientStage("transaction_request_resolved", txHash.slice(0, 12));
  await reportWalletResult({ account, chainId: "0x38", txHash });
  if (!isAllowance) showPostTransactionActions(txHash, false);
  setWalletStage("submitted", isAllowance
    ? "MetaMask 已返回授权交易编号。正在等 BSC 确认；股票还没有买入。"
    : "MetaMask 已返回买入交易编号。正在等 BSC 确认并核对余额…");
  await refreshUntilTerminal();
}

async function waitForPurchaseFollowUp(): Promise<{ id: string; capability: string } | undefined> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const link = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/follow-up`);
      if (typeof link.id === "string" && typeof link.capability === "string") return { id: link.id, capability: link.capability };
    } catch {
      // The MCP host may still be finishing receipt checks and attaching the one-time purchase request.
    }
    try {
      const parent = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}`);
      const result = parent.reconciliation as Record<string, unknown> | undefined;
      if (result?.purchaseFollowUpStatus === "blocked_by_plan_boundary") {
        setStatus(typeof result.reason === "string" ? `授权已完成，但当前报价超出你确认的计划边界，股票没有买入：${result.reason}` : "授权已完成，但更新后的计划不满足原限制；没有开始买入。请回到 Ariadne 查看原因并制定新计划。", "error");
        return undefined;
      }
      if (typeof parent.resultSummary === "string" && parent.state === "confirmed" && result?.purchaseFollowUpStatus === "blocked") {
        setStatus(typeof result.reason === "string" ? `授权已完成，但购买确认没有准备好：${result.reason}` : "授权已完成，但购买确认没有准备好；股票没有买入。请回到 Ariadne 查看原因。", "error");
        return undefined;
      }
    } catch {
      // Keep polling the same one-time session; never create another transaction request here.
    }
    setStatus("USDT 授权已确认。正在把原计划和最新报价逐项核对…");
    await new Promise((resolve) => window.setTimeout(resolve, 1_000));
  }
  setStatus("USDT 授权已确认，但 60 秒内没有收到同一计划的购买确认。没有发起股票买入；请回到 Ariadne 查看状态。", "error");
  return undefined;
}

async function switchToPurchaseFollowUp(followUp: { id: string; capability: string }) {
  handoffId = followUp.id;
  capability = followUp.capability;
  walletAttemptId = crypto.randomUUID();
  walletAttemptStarted = false;
  walletAttemptClaimedByThisPage = false;
  walletTransactionCallStarted = false;
  connectExecutePending = false;
  marketLoopStarted = false;
  snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}`);
  renderPlan(snapshot);
  void updateMarketUntilDone();
  setStatus("原计划的到账下限、报价、钱包、资产和费用限制均通过复核。现在将在 MetaMask 中显示独立的股票买入确认。", "success");
  await runWalletFlow().catch(handleWalletStartError);
}

async function refreshUntilTerminal() {
  if (polling) return;
  polling = true;
  let followUp: { id: string; capability: string } | undefined;
  try {
    while (true) {
      snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}`);
      let state = snapshot.state;
      const allowance = (snapshot.display as Record<string, unknown> | undefined)?.operation === "allowance_approval";
      if (allowance && state === "submitted") {
        setWalletStage("submitted", "MetaMask 已提交授权。正在核对 BSC 最终确认和实际 USDT 额度；股票尚未买入…");
        snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/finalize-allowance`, {
          method: "POST", body: JSON.stringify({})
        });
        state = snapshot.state;
        const immediateFollowUp = snapshot.followUp as { id?: unknown; capability?: unknown } | undefined;
        if (state === "confirmed" && typeof immediateFollowUp?.id === "string" && typeof immediateFollowUp.capability === "string") {
          followUp = { id: immediateFollowUp.id, capability: immediateFollowUp.capability };
          break;
        }
      }
      if (state === "confirmed") {
        if (allowance) {
          setWalletStage("confirmed", "USDT 授权已在 BSC 确认。正在沿用原计划核对实时价格和预计到账…", "success");
          followUp = await waitForPurchaseFollowUp();
          break;
        }
        setWalletStage("confirmed", "股票买入已确认：BSC 交易和钱包余额变化均与计划相符。", "success");
        if (submittedTransactionHash) showPostTransactionActions(submittedTransactionHash, true);
        return;
      }
      if (["failed", "wallet_rejected", "wallet_uncertain", "expired"].includes(String(state))) {
        setWalletStage("error", typeof snapshot.resultSummary === "string" ? snapshot.resultSummary : typeof snapshot.walletError === "string" ? snapshot.walletError : `${allowance ? "授权" : "买入"}状态：${String(state)}。交易结果未能核实。`, "error");
        return;
      }
      if (state === "submitted") setWalletStage("submitted", allowance
        ? "MetaMask 已提交授权。正在等待 BSC 确认；股票尚未买入…"
        : "MetaMask 已提交买入。正在等待 BSC 确认和余额核对…");
      await new Promise((resolve) => window.setTimeout(resolve, 2_000));
    }
  } catch (error) {
    setStatus(`${error instanceof Error ? error.message : "Could not refresh purchase status"} 请保持本页打开；Ariadne 不会重复发送交易。`, "error");
  } finally {
    polling = false;
  }
  if (followUp) await switchToPurchaseFollowUp(followUp);
}

async function handleWalletStartError(error: unknown) {
  const message = error instanceof Error ? error.message : "Wallet request could not start";
  await reportClientStage("client_error", message);
  if (snapshot?.reviewMode === "purchase_intent") {
    await revealDashboard();
    setWalletStage("error", ui(`当前钱包账户的精确计划暂时无法生成：${message} 购买意向仍保留；请刷新本页重试。`, `The exact plan for the selected wallet is temporarily unavailable: ${message} The purchase intent is preserved; refresh this page to retry.`), "error");
    return;
  }
  if (walletTransactionCallStarted && snapshot?.state === "active") {
    try { await reportWalletResult({ account: snapshot.account, chainId: snapshot.chainId, walletError: message }); }
    catch { /* Keep the visible state; the relay may be temporarily unavailable. */ }
    const allowance = (snapshot.display as Record<string, unknown> | undefined)?.operation === "allowance_approval";
    setStatus(`钱包请求没有返回交易编号：${message} 请先检查钱包活动。${allowance ? "授权" : "买入"}结果尚未核实，不要重复提交。`, "error");
  } else {
    if (/quote expired|current execution quote expired/i.test(message)) {
      walletAttemptStarted = false;
      setStatus(`${message}请刷新当前页面；Ariadne会保留原计划并重新获取报价。`, "error");
      return;
    }
    if (/already started|already been attempted|already been used/i.test(message)) {
      setStatus(`${message} 请回到 Ariadne 查看当前请求状态。`, "error");
      return;
    }
    const failureStage = /MetaMask|wallet|provider|浏览器/i.test(message) ? "wallet_discovery" : "wallet_preflight";
    await reportClientFailure(failureStage, message);
    setWalletStage("error", `${message} 钱包请求没有开始，请回到 Ariadne 重新准备这笔计划。`, "error");
  }
}

async function initialize() {
  const match = location.hash.match(/^#([a-f0-9]{32})\.([A-Za-z0-9_-]{40,})$/);
  if (!match) {
    setStatus(ui("这条钱包链接缺少一次性识别码。请回到 Ariadne 对话，打开完整的计划链接，不要只打开 /approve。", "This wallet link is missing its one-time identifier. Return to Ariadne and open the complete link, rather than /approve alone."), "error");
    return;
  }
  handoffId = match[1];
  capability = match[2];
  walletAttemptId = crypto.randomUUID();
  history.replaceState(null, "", location.pathname + location.search);
  setIntroStatus(ui("已识别一次性购买链接，正在读取购买意向…", "One-time purchase link recognized. Loading the purchase intent…"));
  await reportClientStage("page_loaded");
  snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}`);
  if (snapshot.reviewMode === "purchase_intent") {
    setIntroStatus(ui("购买意向已载入，正在读取当前 MetaMask 账户…", "Purchase intent loaded. Reading the current MetaMask account…"));
    await reportClientStage("provider_discovery_started");
    const selected = await discoverWallet();
    await reportClientStage("provider_selected", selected.source);
    await reportClientStage("account_request_started");
    const accounts = await selected.provider.request({ method: "eth_requestAccounts" });
    const account = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : undefined;
    if (!account || !/^0x[0-9a-fA-F]{40}$/.test(account)) throw new Error(ui("MetaMask 没有返回有效的 BSC 账户。", "MetaMask did not return a valid BSC account."));
    let chainId = await selected.provider.request({ method: "eth_chainId" });
    if (typeof chainId !== "string" || chainId.toLowerCase() !== "0x38") {
      await selected.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
      chainId = await selected.provider.request({ method: "eth_chainId" });
    }
    if (typeof chainId !== "string" || chainId.toLowerCase() !== "0x38") throw new Error(ui("请先在 MetaMask 切换到 BNB Chain。", "Switch MetaMask to BNB Chain before continuing."));
    await reportClientStage("account_ready", `${account.slice(0, 6)}…${account.slice(-4)} · BSC`);
    setIntroStatus(ui("钱包账户已确认，正在生成该账户的精确报价与计划…", "Wallet account confirmed. Building its exact quote and plan…"));
    await reportClientStage("quote_refresh_started");
    snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/bind-wallet`, {
      method: "POST", body: JSON.stringify({ account, chainId: "0x38" })
    });
    renderPlan(snapshot);
    const isAllowance = (snapshot.display as Record<string, unknown> | undefined)?.operation === "allowance_approval";
    setIntroStatus(isAllowance
      ? ui("精确计划已生成，正在准备 USDT 授权确认…", "Exact plan ready. Preparing the USDT allowance confirmation…")
      : ui("精确计划已生成，正在准备股票买入确认…", "Exact plan ready. Preparing the stock purchase confirmation…"));
    await reportClientStage("quote_ready");
    await revealDashboard();
    if (snapshot.state !== "active" || !snapshot.request || typeof snapshot.request !== "object") {
      setStatus(ui("精确钱包请求尚未准备好；没有发起钱包操作。", "The exact wallet request is not ready; no wallet action was started."), "error");
      return;
    }
    setWalletStage("quote", isAllowance
      ? ui("USDT 授权额度不足。MetaMask 将显示精确额度；确认后才会另行显示股票买入。", "USDT allowance is insufficient. MetaMask will show the exact amount; the stock purchase is presented separately after confirmation.")
      : ui("钱包账户、报价和费用已经绑定，正在请求 MetaMask 复核。", "The wallet account, quote and fees are bound. Asking MetaMask for review."));
    await runWalletFlow();
    return;
  }
  renderPlan(snapshot);
  setIntroStatus("原计划已载入，正在核对最新执行条件…");
  await reportClientStage("plan_loaded");
  void updateMarketUntilDone();
  if (snapshot.reviewMode === "purchase_plan") {
    setStatus("保留原计划，正在从 Binance Web3 获取最新可执行报价和网络费…");
    setIntroStatus("正在从 Binance Web3 刷新执行报价与网络费…");
    await reportClientStage("quote_refresh_started");
    try {
      snapshot = await relay(`/api/handoffs/${encodeURIComponent(handoffId)}/refresh-purchase`, { method: "POST", body: JSON.stringify({}) });
      renderPlan(snapshot);
      const isAllowance = (snapshot.display as Record<string, unknown> | undefined)?.operation === "allowance_approval";
      setIntroStatus(isAllowance ? "购买条件已核对，正在准备精确 USDT 授权…" : "最新报价已就绪，正在展开购买复核界面…");
      await reportClientStage("quote_ready");
      await revealDashboard();
      if (snapshot.requiresQuoteAcceptance === true) {
        setStatus("最新报价和原计划差异超过原滑点上限。请先查看差异，再决定是否继续。", "error");
        return;
      }
      if (snapshot.state !== "active" || !snapshot.request || typeof snapshot.request !== "object") {
        setStatus("最新钱包请求尚未准备好；没有请求钱包操作。请查看本页说明。", "error");
        return;
      }
      setWalletStage("quote", isAllowance
        ? "当前 USDT 授权额度不足。正在请求 MetaMask 复核精确额度；授权确认后才会另行显示股票买入。"
        : "同一计划的最新报价和费用已就绪，正在请求 MetaMask 复核…");
      await runWalletFlow();
    } catch (error) {
      await revealDashboard();
      const message = error instanceof Error ? error.message : "无法为原计划取得最新执行报价；没有请求钱包操作。";
      setWalletStage("error", message, "error");
      await reportClientStage("client_error", message);
    }
    return;
  }
  setIntroStatus("钱包请求已经准备好，正在展开复核界面…");
  await revealDashboard();
  if (snapshot.state !== "active") {
    setStatus(snapshot.state === "prepared" ? "正在准备这笔精确的钱包请求…" : `钱包请求状态：${String(snapshot.state)}。`);
    return;
  }
  if (snapshot.walletAttemptClaimedAt !== undefined) {
    setStatus("这笔钱包请求已在其他页面尝试。请回到 Ariadne 检查状态；不要再次提交。", "error");
    return;
  }
  setWalletStage("plan", "这份钱包请求已就绪，正在连接 MetaMask…");
  await runWalletFlow();
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && handoffId && snapshot?.state === "submitted") void refreshUntilTerminal();
  if (!document.hidden) updateMarketPanel(latestMarket);
});
window.setInterval(() => updateMarketPanel(latestMarket), 1_000);
document.querySelector<HTMLButtonElement>("#watch-asset")?.addEventListener("click", () => void addPurchasedAssetToMetaMask());
startCinematicBadge();
void initialize().catch(handleWalletStartError);
