"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset } from "./assets";
import { assessTimestampFreshness, candleDisplayState, candleTimestampLabels, formatUtcTimestamp, marketStatusGroup, QUOTE_STALE_AFTER_MS, refreshFailureState, sameRepresentation, stateForIdentity } from "./market-freshness";
import { hasTimestampedQuote, marketForQuoteDisplay, type TimestampedQuote } from "./market-presentation";
import { useSite } from "./site";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type CandleResponse = { view?: { state: string; candles: Candle[]; asOf: number | null; source: string; chainId: string; platformId: string; contractAddress: string; sourceResponseTimestampMs: number | null }; error?: { message?: string } };
type PriceSnapshot = TimestampedQuote & { chainId: string; platformId: string; contractAddress: string };
type MarketQuoteState = "loading" | "fresh" | "stale" | "missing" | "ambiguous" | "invalid" | "unavailable" | "demo";
type QuoteResponse = {
  view?: {
    asset: { issuer: string; tokenSymbol: string };
    quote: { success: boolean; expectedOutput?: string; priceImpact?: string; venue?: string; expiresAt?: number; minimumOutputAvailable: boolean };
    warnings: string[];
  };
  error?: { message?: string };
};
type PreflightResponse = {
  view?: {
    status: string;
    safety: { passed: boolean; checks: Array<{ name: string; passed: boolean; message: string }>; blockingReasons: string[] } | null;
    simulation: { state: "not_run" | "unsupported_route" | "completed"; success?: boolean; warnings?: string[] };
  };
  error?: { message?: string };
};
const intervals = ["1m", "5m", "15m", "1h", "1d"] as const;
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const identityForQuote = (quote?: PriceSnapshot | null) => quote ? `${quote.chainId}:${quote.platformId.toLowerCase()}:${quote.contractAddress.toLowerCase()}` : undefined;
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 6 : 2 }).format(n);
const number = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const compactNumber = (n: number) => Number.isFinite(n) ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n) : "—";
const identityFor = (asset?: Asset) => asset ? `${asset.token.chainId}:${asset.issuer.id.toLowerCase()}:${asset.token.contractAddress.toLowerCase()}` : "";
function marketStatusLabel(status: string | undefined, t: (en: string, zh: string, ko: string) => string): string {
  switch (marketStatusGroup(status)) {
    case "open": return t("Open", "开放", "개장");
    case "closed": return t("Closed", "休市", "폐장");
    case "offhours": return t("Off hours", "非交易时段", "장외 시간");
    default: return t("Unknown", "未知", "알 수 없음");
  }
}

function CandleChart({ candles, selected, onSelect }: { candles: Candle[]; selected: number | null; onSelect: (index: number | null) => void }) {
  const width = 900, height = 370, left = 16, right = 78, top = 18, priceBottom = 280, volumeTop = 299, volumeBottom = 340;
  const low = Math.min(...candles.map(c => c.low)), high = Math.max(...candles.map(c => c.high));
  const span = Math.max(high - low, high * .002);
  const min = low - span * .08, max = high + span * .08;
  const x = (index: number) => left + (index + .5) * (width - left - right) / candles.length;
  const y = (price: number) => top + (max - price) * (priceBottom - top) / (max - min);
  const maxVolume = Math.max(1, ...candles.map(c => c.volume));
  const bar = Math.max(3, Math.min(10, (width - left - right) / candles.length * .65));
  const active = selected === null ? candles.at(-1) : candles[selected];
  return <div className="chart-stage">
    <div className="chart-readout"><span>{active ? formatUtcTimestamp(active.time) : "—"}</span><span>O <b>{active ? usd(active.open) : "—"}</b></span><span>H <b>{active ? usd(active.high) : "—"}</b></span><span>L <b>{active ? usd(active.low) : "—"}</b></span><span>C <b>{active ? usd(active.close) : "—"}</b></span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Historical candlestick chart with volume">
      <defs><linearGradient id="chartVolume" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d36c51" stopOpacity=".36"/><stop offset="1" stopColor="#d36c51" stopOpacity=".04"/></linearGradient></defs>
      {Array.from({ length: 5 }, (_, i) => { const price = max - i * (max - min) / 4; const gy = y(price); return <g key={i}><line x1={left} x2={width - right} y1={gy} y2={gy} stroke="#ffffff" strokeOpacity=".075" strokeDasharray={i === 4 ? undefined : "2 5"}/><text x={width - right + 12} y={gy + 4} fill="#8a837b" fontSize="11">{usd(price)}</text></g>; })}
      {candles.map((c, i) => { const cx = x(i), up = c.close >= c.open, color = up ? "#c6b597" : "#d7664d"; return <g key={c.time}><line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.25"/><rect x={cx - bar / 2} y={Math.min(y(c.open), y(c.close))} width={bar} height={Math.max(2, Math.abs(y(c.open) - y(c.close)))} fill={color}/><rect x={cx - bar / 2} y={volumeBottom - (c.volume / maxVolume) * (volumeBottom - volumeTop)} width={bar} height={(c.volume / maxVolume) * (volumeBottom - volumeTop)} fill={color} opacity=".38"/></g>; })}
      {selected !== null && candles[selected] && <g pointerEvents="none"><line x1={x(selected)} x2={x(selected)} y1={top} y2={volumeBottom} stroke="#d4bba2" strokeOpacity=".45" strokeDasharray="3 5"/><circle cx={x(selected)} cy={y(candles[selected].close)} r="3" fill="#e6b5a0"/></g>}
      {Array.from({ length: 5 }, (_, i) => { const idx = Math.round(i * (candles.length - 1) / 4); return <text key={i} x={x(idx)} y="365" textAnchor="middle" fill="#77716a" fontSize="10">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(candles[idx].time)}</text>; })}
      <rect x={left} y={top} width={width - left - right} height={volumeBottom - top} fill="transparent" onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); const relative = (event.clientX - rect.left) / rect.width; onSelect(Math.min(candles.length - 1, Math.max(0, Math.floor(relative * candles.length)))); }} onPointerLeave={() => onSelect(null)}/>
    </svg>
  </div>;
}

export function AssetWorkbench({ assets, mode }: { assets: Asset[]; mode: string }) {
  const { t, lang } = useSite();
  const [selectedIdentity, setSelectedIdentity] = useState(() => identityFor(assets[0]));
  const [bar, setBar] = useState<typeof intervals[number]>("5m");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartState, setChartState] = useState("loading");
  const [loadedCandleIdentity, setLoadedCandleIdentity] = useState("");
  const [asOf, setAsOf] = useState<number | null>(null);
  const [candleResponseTime, setCandleResponseTime] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [marketQuote, setMarketQuote] = useState<PriceSnapshot | null>(null);
  const [marketQuoteState, setMarketQuoteState] = useState<MarketQuoteState>(mode === "demo" ? "demo" : "loading");
  const [marketQuoteStateIdentity, setMarketQuoteStateIdentity] = useState("");
  const lastMarketQuote = useRef<PriceSnapshot | null>(null);
  const lastValidCandles = useRef<{ identity: string; candles: Candle[]; asOf: number; responseTime: number | null } | null>(null);
  const [wallet, setWallet] = useState("");
  const [amount, setAmount] = useState("100");
  const [quote, setQuote] = useState<QuoteResponse["view"] | null>(null);
  const [quoteState, setQuoteState] = useState("idle");
  const [quoteError, setQuoteError] = useState("");
  const [preflight, setPreflight] = useState<PreflightResponse["view"] | null>(null);
  const [preflightState, setPreflightState] = useState("idle");
  const [preflightError, setPreflightError] = useState("");
  const requestEpoch = useRef(0);
  const asset = useMemo(() => assets.find(a => identityFor(a) === selectedIdentity) ?? assets[0], [assets, selectedIdentity]);
  const ticker = asset?.underlying.ticker;
  const representationIdentity = identityFor(asset);
  const quoteStateIdentity = `${representationIdentity}/${mode}`;
  const candleIdentity = asset ? `${representationIdentity}/${ticker}/${bar}/${mode}` : "";
  function publishMarketQuoteState(state: MarketQuoteState) {
    setMarketQuoteState(state);
    setMarketQuoteStateIdentity(quoteStateIdentity);
  }
  useEffect(() => {
    if (assets.length && !assets.some(item => identityFor(item) === selectedIdentity)) setSelectedIdentity(identityFor(assets[0]));
  }, [assets, selectedIdentity]);
  useEffect(() => { requestEpoch.current += 1; setQuote(null); setQuoteState("idle"); setQuoteError(""); setPreflight(null); setPreflightState("idle"); }, [representationIdentity, wallet, amount]);
  useEffect(() => {
    if (!asset || mode !== "live-readonly") {
      lastMarketQuote.current = null;
      setMarketQuote(null);
      publishMarketQuoteState(mode === "demo" ? "demo" : "unavailable");
      return;
    }
    let current: AbortController | null = null;
    let mounted = true;
    async function load() {
      if (document.hidden) return;
      current?.abort();
      current = new AbortController();
      if (!lastMarketQuote.current) publishMarketQuoteState("loading");
      try {
        const url = new URL("/api/asset-prices", location.origin);
        url.searchParams.set("chainId", asset.token.chainId);
        url.searchParams.append("representation", `${asset.issuer.id}:${asset.token.contractAddress}`);
        const response = await fetch(url, { signal: current.signal, cache: "no-store" });
        const body = await response.json() as { view?: { items?: PriceSnapshot[] }; error?: { message?: string } };
        if (!response.ok || !Array.isArray(body.view?.items)) throw Error(body.error?.message ?? "Timestamped quote unavailable");
        if (!mounted) return;
        const matches = body.view.items.filter(item => item.chainId === asset.token.chainId && item.platformId.toLowerCase() === asset.issuer.id.toLowerCase() && item.contractAddress.toLowerCase() === asset.token.contractAddress.toLowerCase());
        if (matches.length > 1) {
          lastMarketQuote.current = null;
          setMarketQuote(null);
          publishMarketQuoteState("ambiguous");
          return;
        }
        const snapshot = matches[0];
        if (!snapshot) {
          lastMarketQuote.current = null;
          setMarketQuote(null);
          publishMarketQuoteState("missing");
          return;
        }
        if (snapshot.state !== "available") {
          lastMarketQuote.current = null;
          setMarketQuote(null);
          publishMarketQuoteState(snapshot.state);
          return;
        }
        if (!hasTimestampedQuote(snapshot)) {
          lastMarketQuote.current = null;
          setMarketQuote(null);
          publishMarketQuoteState("invalid");
          return;
        }
        const freshness = assessTimestampFreshness(snapshot.tokenPriceUpdatedAt, Date.now(), QUOTE_STALE_AFTER_MS);
        if (freshness === "invalid" || freshness === "unknown") {
          lastMarketQuote.current = null;
          setMarketQuote(null);
          publishMarketQuoteState("invalid");
          return;
        }
        lastMarketQuote.current = snapshot;
        setMarketQuote(snapshot);
        publishMarketQuoteState(freshness);
      } catch (error) {
        if (mounted && !(error instanceof DOMException && error.name === "AbortError")) {
          if (lastMarketQuote.current && refreshFailureState(identityForQuote(lastMarketQuote.current), representationIdentity) === "stale") {
            setMarketQuote(lastMarketQuote.current);
            publishMarketQuoteState("stale");
          } else {
            publishMarketQuoteState("unavailable");
          }
        }
      }
    }
    lastMarketQuote.current = null;
    setMarketQuote(null);
    publishMarketQuoteState("loading");
    void load();
    const timer = window.setInterval(() => { void load(); }, 30000);
    document.addEventListener("visibilitychange", load);
    return () => { mounted = false; current?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [representationIdentity, mode]);
  useEffect(() => {
    if (!asset || mode !== "live-readonly") { setCandles([]); setLoadedCandleIdentity(candleIdentity); setChartState("unavailable"); return; }
    let current: AbortController | null = null;
    let mounted = true;
    async function load() {
      if (document.hidden) return;
      current?.abort();
      current = new AbortController();
      setChartState(previous => previous === "ready" || previous === "stale" ? previous : "loading");
      try {
        const url = new URL("/api/market-candles", location.origin);
        url.searchParams.set("query", ticker);
        url.searchParams.set("chainId", asset.token.chainId);
        url.searchParams.set("platformId", asset.issuer.id);
        url.searchParams.set("contractAddress", asset.token.contractAddress);
        url.searchParams.set("bar", bar);
        const response = await fetch(url, { signal: current.signal, cache: "no-store" });
        const body: CandleResponse = await response.json();
        if (!response.ok || !Array.isArray(body.view?.candles)) throw Error(body.error?.message ?? "Market data unavailable");
        if (!mounted) return;
        if (!sameRepresentation({ chainId: asset.token.chainId, platformId: asset.issuer.id, contractAddress: asset.token.contractAddress }, body.view)) throw Error("Candle response representation did not match the selected issuer");
        const state = candleDisplayState(body.view.state, body.view.asOf, bar, Date.now());
        if (state === "ready" || state === "stale") {
          setCandles(body.view.candles);
          setAsOf(body.view.asOf);
          setCandleResponseTime(body.view.sourceResponseTimestampMs);
          if (body.view.asOf) lastValidCandles.current = { identity: candleIdentity, candles: body.view.candles, asOf: body.view.asOf, responseTime: body.view.sourceResponseTimestampMs };
          setLoadedCandleIdentity(candleIdentity);
          setChartState(state);
        } else if (lastValidCandles.current) {
          setCandles(lastValidCandles.current.candles);
          setAsOf(lastValidCandles.current.asOf);
          setCandleResponseTime(lastValidCandles.current.responseTime);
          setLoadedCandleIdentity(candleIdentity);
          setChartState("stale");
        } else {
          setCandles([]);
          setAsOf(body.view.asOf);
          setCandleResponseTime(body.view.sourceResponseTimestampMs);
          setLoadedCandleIdentity(candleIdentity);
          setChartState(state);
        }
        setSelected(null);
      } catch (error) {
        if (mounted && !(error instanceof DOMException && error.name === "AbortError")) {
          if (lastValidCandles.current && refreshFailureState(lastValidCandles.current.identity, candleIdentity) === "stale") {
            setCandles(lastValidCandles.current.candles);
            setAsOf(lastValidCandles.current.asOf);
            setCandleResponseTime(lastValidCandles.current.responseTime);
            setLoadedCandleIdentity(candleIdentity);
            setChartState("stale");
          } else { setLoadedCandleIdentity(candleIdentity); setChartState("error"); }
        }
      }
    }
    lastValidCandles.current = null;
    setCandles([]);
    setAsOf(null);
    setCandleResponseTime(null);
    setChartState("loading");
    void load();
    const timer = window.setInterval(() => { void load(); }, 30000);
    document.addEventListener("visibilitychange", load);
    return () => { mounted = false; current?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [candleIdentity, mode]);
  if (!asset) return null;
  const quoteMatchesSelected = marketQuoteStateIdentity === quoteStateIdentity && sameRepresentation({ chainId: asset.token.chainId, platformId: asset.issuer.id, contractAddress: asset.token.contractAddress }, marketQuote);
  const displayedQuoteState = mode === "demo" ? "demo" : stateForIdentity(marketQuoteStateIdentity, quoteStateIdentity, marketQuoteState, "loading");
  const displayedMarket = marketForQuoteDisplay(asset.market, mode === "live-readonly" && quoteMatchesSelected ? marketQuote ?? undefined : undefined, mode === "live-readonly");
  const candleMatchesSelected = loadedCandleIdentity === candleIdentity;
  const displayedChartState = stateForIdentity(loadedCandleIdentity, candleIdentity, chartState, "loading");
  const displayedCandles = candleMatchesSelected ? candles : [];
  const displayedAsOf = candleMatchesSelected ? asOf : null;
  const displayedCandleResponseTime = candleMatchesSelected ? candleResponseTime : null;
  const candleTimeLabels = candleTimestampLabels(displayedAsOf, displayedCandleResponseTime, lang === "zh" ? "zh-CN" : lang === "ko" ? "ko-KR" : "en-US");
  const market = displayedMarket;
  const price = displayedMarket?.tokenPrice ? Number(displayedMarket.tokenPrice) : NaN;
  const quoteTime = displayedMarket?.tokenPriceUpdatedAt ? formatUtcTimestamp(displayedMarket.tokenPriceUpdatedAt, lang === "zh" ? "zh-CN" : lang === "ko" ? "ko-KR" : "en-US") : undefined;
  const quoteStateLabel = displayedQuoteState === "demo"
    ? t("Demo value · not live", "演示值 · 非实时", "데모 값 · 실시간 아님")
    : displayedQuoteState === "fresh" && quoteTime
      ? t(`Source updated ${quoteTime}`, `来源更新时间 ${quoteTime}`, `소스 업데이트 ${quoteTime}`)
      : displayedQuoteState === "stale" && quoteTime
        ? t(`Stale · last source update ${quoteTime}`, `数据可能已过期 · 来源最后更新时间 ${quoteTime}`, `오래된 데이터 · 마지막 소스 업데이트 ${quoteTime}`)
        : displayedQuoteState === "loading"
          ? t("Loading timestamped source quote…", "正在读取带时间戳的来源报价…", "타임스탬프가 있는 소스 시세를 불러오는 중…")
          : displayedQuoteState === "missing"
            ? t("No quote supplied for this representation", "该链上表示暂无报价", "이 온체인 표현의 시세가 없습니다")
            : displayedQuoteState === "ambiguous"
              ? t("Quote identity is ambiguous", "报价身份不明确", "시세 식별이 모호합니다")
              : displayedQuoteState === "invalid"
                ? t("Quote timestamp or value could not be verified", "报价时间戳或数值无法验证", "시세 타임스탬프 또는 값을 확인할 수 없습니다")
                : t("Timestamped source quote unavailable", "带时间戳的来源报价暂不可用", "타임스탬프가 있는 소스 시세를 사용할 수 없습니다");
  const marketStatus = marketStatusLabel(displayedMarket?.marketStatus, (en, zh, ko) => t(en, zh, ko));
  async function requestQuote() {
    if (!addressPattern.test(wallet) || !/^\d{1,7}$/.test(amount) || Number(amount) <= 0 || Number(amount) > 1_000_000) {
      setQuoteError(t("Enter a public EVM address and 1–1,000,000 whole USDT.", "请输入公开的 EVM 地址与 1–1,000,000 的整数 USDT 金额。", "공개 EVM 주소와 1–1,000,000 정수 USDT를 입력하세요."));
      return;
    }
    const epoch = ++requestEpoch.current;
    setQuoteState("loading"); setQuote(null); setQuoteError("");
    try {
      const url = new URL("/api/asset-quote", location.origin);
      for (const [key, value] of Object.entries({ query: ticker, chainId: "56", platformId: asset.issuer.id, contractAddress: asset.token.contractAddress, walletAddress: wallet, amount })) url.searchParams.set(key, value);
      const response = await fetch(url, { cache: "no-store" });
      const body: QuoteResponse = await response.json();
      if (!response.ok || !body.view) throw Error(body.error?.message ?? "Quote unavailable");
      if (requestEpoch.current === epoch) { setQuote(body.view); setQuoteState("ready"); }
    } catch (error) { if (requestEpoch.current === epoch) { setQuoteError(error instanceof Error ? error.message : String(error)); setQuoteState("error"); } }
  }
  async function requestPreflight() {
    const epoch = ++requestEpoch.current;
    setPreflightState("loading"); setPreflight(null); setPreflightError("");
    try {
      const url = new URL("/api/asset-preflight", location.origin);
      for (const [key, value] of Object.entries({ query: ticker, chainId: "56", platformId: asset.issuer.id, contractAddress: asset.token.contractAddress, walletAddress: wallet, amount })) url.searchParams.set(key, value);
      const response = await fetch(url, { cache: "no-store" });
      const body: PreflightResponse = await response.json();
      if (!response.ok || !body.view) throw Error(body.error?.message ?? "Preflight unavailable");
      if (requestEpoch.current === epoch) { setPreflight(body.view); setPreflightState("ready"); }
    } catch (error) { if (requestEpoch.current === epoch) { setPreflightError(error instanceof Error ? error.message : String(error)); setPreflightState("error"); } }
  }
  return <section id="market" className="asset-workbench" aria-label={t("Asset market workspace", "资产市场工作台", "자산 시장 워크스페이스")}>
    <div className="workbench-strip"><div><span className="eyebrow">MARKET / {ticker}</span><strong>{asset.token.symbol}</strong><span>{asset.issuer.name} · BNB Chain</span></div><div><small>{t("Representation token price", "链上表示代币价格", "온체인 표현 토큰 가격")}</small><strong>{Number.isFinite(price) ? usd(price) : "—"}</strong><small>{quoteStateLabel}</small></div><div><small>{t("24h source volume", "来源 24h 成交量", "소스 24시간 거래량")}</small><strong>{market?.volume24H ? compactNumber(Number(market.volume24H)) : "—"}</strong></div><div><small>{t("Underlying market state", "底层市场状态", "기초 시장 상태")}</small><strong>{marketStatus}</strong></div></div>
    <div className="workbench-issuers"><span>{t("REPRESENTATION", "链上表示", "온체인 표현")}</span>{assets.map(a => <button key={a.id} aria-pressed={identityFor(a) === representationIdentity} onClick={() => setSelectedIdentity(identityFor(a))}><b>{a.issuer.name}</b><small>{a.token.symbol}</small></button>)}</div>
    <div className="workbench-grid"><div className="workbench-chart-panel"><div className="workbench-panel-head"><div><strong>{ticker} / USD</strong><span>{asset.issuer.name} · {t("historical candles", "历史 K 线", "과거 캔들")}</span></div><div className="workbench-intervals">{intervals.map(value => <button key={value} aria-pressed={bar === value} onClick={() => setBar(value)}>{value}</button>)}</div></div><div className="chart-wrap">{(displayedChartState === "ready" || displayedChartState === "stale" || displayedChartState === "invalid") && displayedCandles.length ? <><CandleChart candles={displayedCandles} selected={selected} onSelect={setSelected}/>{displayedChartState !== "ready" && <p className="chart-data-warning" role="status">{displayedChartState === "stale" ? t("Showing last available candles; they may be stale.", "当前显示最近可用的 K 线，数据可能已过期。", "마지막으로 이용 가능한 캔들을 표시하며 오래된 데이터일 수 있습니다.") : t("Candle time could not be verified.", "K 线时间无法验证。", "캔들 시간을 확인할 수 없습니다.")}</p>}</> : <div className="chart-empty" role="status"><span className="chart-empty-mark">╱</span><strong>{displayedChartState === "loading" ? t("Loading source candles…", "正在读取来源 K 线…", "소스 캔들을 불러오는 중…") : displayedChartState === "error" ? t("Market candles unavailable", "市场 K 线暂不可用", "시장 캔들을 이용할 수 없습니다") : displayedChartState === "invalid" ? t("Candle timestamp could not be verified", "K 线时间戳无法验证", "캔들 타임스탬프无法验证") : t("No candles supplied for this representation", "该链上表示暂无 K 线数据", "이 온체인 표현에는 캔들 데이터가 없습니다")}</strong><small>{t("We do not draw simulated price history.", "不使用模拟数据绘制价格历史。", "모의 가격 기록을 그리지 않습니다.")}</small></div>}</div><div className="workbench-chart-foot"><span>{displayedChartState === "ready" || displayedChartState === "stale" || displayedChartState === "invalid" ? t("SOURCE / BINANCE WEB3 MARKET API", "来源 / BINANCE WEB3 MARKET API", "소스 / BINANCE WEB3 MARKET API") : t("SOURCE DATA PENDING", "等待来源数据", "소스 데이터 대기 중")}</span><span>{t("Last bar (UTC)", "最后一根 K 线（UTC）", "마지막 캔들 (UTC)")}: {candleTimeLabels.lastBarUtc ?? "—"}<br/>{t("Provider response time", "来源响应时间", "공급자 응답 시각")}: {candleTimeLabels.providerResponseUtc ?? t("not supplied", "未提供", "제공되지 않음")}</span></div></div>
    <aside className="workbench-side"><div className="workbench-side-head"><span className="eyebrow">01 / {t("READ-ONLY QUOTE", "只读报价", "읽기 전용 견적")}</span><h2>{t("Price a route.", "预览交易路径。", "거래 경로 미리보기.")}</h2><p>{t("Select a representation and request a live USDT buy quote. No order is placed.", "选择链上表示，查询实时 USDT 买入报价。不会下单。", "온체인 표현을 선택하고 실시간 USDT 매수 견적을 조회하세요. 주문은 실행되지 않습니다.")}</p></div><div className="quote-form"><label>{t("Pay", "支付", "지불")} <strong>USDT</strong><input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} aria-label={t("USDT amount", "USDT 金额", "USDT 금액")}/><small>{t("Whole USDT units", "仅支持整数 USDT", "정수 USDT 단위")}</small></label><label>{t("Public wallet address", "公开钱包地址", "공개 지갑 주소")}<input value={wallet} onChange={e => setWallet(e.target.value)} placeholder="0x…" spellCheck={false} aria-label={t("Public wallet address", "公开钱包地址", "공개 지갑 주소")}/></label><button className="quote-action" disabled={quoteState === "loading" || mode !== "live-readonly"} onClick={() => void requestQuote()}>{quoteState === "loading" ? t("Checking route…", "正在查询路径…", "경로 확인 중…") : t("Preview quote ↗", "预览报价 ↗", "견적 미리보기 ↗")}</button>{mode !== "live-readonly" && <small>{t("Live source required for a quote.", "报价需要实时来源。", "견적에는 실시간 소스가 필요합니다.")}</small>}{quoteError && <p className="quote-error" role="alert">{quoteError}</p>}</div>{quote && <div className="quote-result" role="status"><span className="eyebrow">{t("ROUTE PREVIEW · NOT AN ORDER", "路径预览 · 非订单", "경로 미리보기 · 주문 아님")}</span><div><span>{t("Source output (raw units)", "来源输出（原始单位）", "소스 출력 (원시 단위)")}</span><strong className="quote-raw">{quote.quote.expectedOutput ?? "—"}</strong></div><div><span>{t("Price-impact source value", "价格影响来源值", "가격 영향 소스 값")}</span><strong>{quote.quote.priceImpact ?? "—"}</strong></div><div><span>{t("Venue", "交易场所", "거래 장소")}</span><strong>{quote.quote.venue ?? "—"}</strong></div><div><span>{t("Minimum output", "最低获得量", "최소 수령량")}</span><strong>{quote.quote.minimumOutputAvailable ? t("Provided", "已提供", "제공됨") : t("Not provided", "未提供", "제공되지 않음")}</strong></div><p>{t("Token decimals are not verified by this quote source. Raw output is not a human-readable token amount or executable price.", "此报价来源未校验代币精度。原始输出不是可直接阅读的代币数量或可执行价格。", "토큰 소수 자릿수가 확인되지 않았습니다. 원시 출력은 사람이 읽는 토큰 수량이나 실행 가격이 아닙니다.")}</p>{quote.warnings.length > 0 && <p>{quote.warnings.join(" · ")}</p>}</div>}<div className="workbench-safety"><span>02 / {t("EXECUTION BOUNDARY", "执行边界", "실행 경계")}</span><p>{t("A quote is not a trade. This preview does not request a signature, create a transaction or broadcast one.", "报价不等于交易。本页不会请求签名、创建交易或广播交易。", "견적은 거래가 아닙니다. 이 미리보기는 서명 요청이나 거래 전송을 하지 않습니다.")}</p></div></aside></div>
    {quote && <div className="workbench-preflight"><div><span className="eyebrow">02 / {t("PRE-TRANSACTION CHECK", "交易前检查", "거래 전 검사")}</span><p>{t("Check safety conditions and simulate an unsigned EVM route when the source supports it. RFQ routes cannot be EVM-simulated here.", "检查安全条件；仅当来源提供未签名 EVM 路径时进行模拟。RFQ 路径不能在此进行 EVM 模拟。", "안전 조건을 확인하고 소스가 지원하는 경우 서명되지 않은 EVM 경로를 시뮬레이션합니다.")}</p></div><button disabled={preflightState === "loading"} onClick={() => void requestPreflight()}>{preflightState === "loading" ? t("Checking…", "检查中…", "검사 중…") : t("Run read-only check ↗", "运行只读检查 ↗", "읽기 전용 검사 실행 ↗")}</button>{preflightError && <p className="quote-error" role="alert">{preflightError}</p>}{preflight && <div className="preflight-result" role="status"><strong>{preflight.safety?.passed ? t("Safety checks passed", "安全检查通过", "안전 검사 통과") : t("Not ready to execute", "尚不满足执行条件", "실행 준비 안 됨")}</strong><span>{preflight.simulation.state === "completed" ? preflight.simulation.success ? t("EVM simulation passed", "EVM 模拟通过", "EVM 시뮬레이션 통과") : t("EVM simulation failed", "EVM 模拟未通过", "EVM 시뮬레이션 실패") : preflight.simulation.state === "unsupported_route" ? t("RFQ · EVM simulation not applicable", "RFQ · 不适用 EVM 模拟", "RFQ · EVM 시뮬레이션 해당 없음") : t("EVM simulation not run", "未运行 EVM 模拟", "EVM 시뮬레이션 미실행")}</span>{preflight.safety?.blockingReasons.map(reason => <small key={reason}>{reason}</small>)}{preflight.simulation.warnings?.map(reason => <small key={reason}>{reason}</small>)}</div>}</div>}
    <div className="workbench-meta"><span>{t("Exact contract", "对应合约", "해당 계약")} <code>{asset.token.contractAddress}</code></span><span>{t("Underlying reference price", "底层参考价格", "기초자산 참조 가격")} <b>{market?.referencePrice ? usd(Number(market.referencePrice)) : "—"}</b></span><span>{t("24h volume", "24h 成交量", "24시간 거래량")} <b>{market?.volume24H ? number(Number(market.volume24H)) : "—"}</b></span><a href={`https://bscscan.com/token/${encodeURIComponent(asset.token.contractAddress)}`} target="_blank" rel="noreferrer">{t("Explorer", "区块浏览器", "탐색기")} ↗</a></div><p className="workbench-explanation">{t("Token price is for the selected on-chain representation; reference price describes the underlying asset. Any displayed gap uses the same timestamped quote snapshot. Neither value is an executable quote. The five-minute stale marker is a display heuristic, not a source freshness guarantee. Market state is catalog context; this source does not provide a separate status-update timestamp.", "代币价格对应当前选中的链上表示；参考价格描述底层资产。展示的价差只使用同一份带时间戳的报价快照计算。两者都不是可执行报价。五分钟过期标记仅用于界面提示，不代表来源方的行情时效承诺。市场状态属于目录上下文，来源没有单独提供状态更新时间。", "토큰 가격은 선택한 온체인 표현에 해당하며 참조 가격은 기초자산을 설명합니다. 표시되는 차이는 동일한 타임스탬프 견적 스냅샷으로만 계산합니다. 어느 값도 실행 가능한 견적은 아닙니다. 5분 오래됨 표시는 UI 휴리스틱이며 소스의 최신성 보장이 아닙니다. 시장 상태는 카탈로그 맥락이며 별도의 상태 업데이트 시각은 제공되지 않습니다.")}</p>
  </section>;
}
