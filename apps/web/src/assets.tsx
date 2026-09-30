"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSite } from "./site";
import { Mark } from "./brand-home";
import { AssetWorkbench } from "./asset-workbench";
import { loadAssetCatalogSnapshot, type AssetCatalogPayload } from "./catalog-client";
import { hasTimestampedQuote, marketForQuoteDisplay, timestampedQuoteCount } from "./market-presentation";
type Market = {
    tokenPrice?: string;
    referencePrice?: string;
    priceGapPercent?: string;
    marketStatus?: string;
    tokenPriceUpdatedAt?: number;
    updatedAt?: number;
    volume24H?: string;
    liquidity?: string;
    marketCap?: string;
    peRatioTTM?: string;
    dataWarnings?: string[];
};
export type Asset = {
    id: string;
    underlying: {
        ticker: string;
        name: string;
        logoUrl?: string;
    };
    token: {
        symbol: string;
        contractAddress: string;
        chainId: string;
    };
    issuer: {
        id: string;
        name: string;
        website?: string;
    };
    market?: Market;
};
type Catalog = AssetCatalogPayload<Asset>;
type PriceSnapshot = {
    chainId: string;
    platformId: string;
    contractAddress: string;
    state: "available" | "missing" | "ambiguous" | "invalid" | "unavailable";
    tokenPrice?: string;
    referencePrice?: string;
    tokenPriceUpdatedAt?: number;
};
const emptyCatalog: Catalog = {
    mode: "",
    view: {
        items: [],
        summary: { totalRepresentations: 0, distinctTickerValues: 0, issuerCount: 0, returned: 0 },
        pagination: { hasMore: false, offset: 0, limit: 0, returned: 0 }
    }
};
type Research = {
    mode: string;
    view: {
        state: string;
        representations: Array<{
            id: string;
            market: Market;
            evidence: {
                missingFields: string[];
                warnings: string[];
            };
            comparison: {
                eligible: boolean;
                excludedReasons: string[];
            };
        }>;
    };
};
function safeNumber(value?: string) { if (!value?.trim())
    return undefined; const n = Number(value.replace(/%$/, "")); return Number.isFinite(n) ? n : undefined; }
function money(value?: string) { const n = safeNumber(value); return n === undefined ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n); }
function pct(value?: string) { const n = safeNumber(value); return n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(3)}%`; }
function compactMoney(value?: string) { const n = safeNumber(value); return n === undefined ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(n); }
function Logo({ asset }: {
    asset: Asset;
}) {
    const [failed, setFailed] = useState(false);
    const marks: Record<string, string> = { NVDA: "nvidia", AAPL: "apple", MSFT: "microsoft", TSLA: "tesla" };
    const mark = marks[asset.underlying.ticker];
    return <span className="asset-logo">{mark ? <Mark mark={mark}/> : asset.underlying.logoUrl && !failed ? <img src={asset.underlying.logoUrl} alt="" onError={() => setFailed(true)}/> : <span>{asset.underlying.ticker.slice(0, 2)}</span>}</span>;
}
function useCatalog() {
    const [data, setData] = useState<Catalog>(emptyCatalog), [error, setError] = useState(false), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        (async () => {
            const payload = await loadAssetCatalogSnapshot<Asset>(controller.signal);
            if (!controller.signal.aborted)
                setData(payload);
        })().catch(() => { if (!controller.signal.aborted)
            setError(true); }).finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [retry]);
    return { data, error, loading, reload: () => setRetry(v => v + 1) };
}
function DataState({ loading, error, reload }: {
    loading: boolean;
    error: boolean;
    reload: () => void;
}) {
    const { t } = useSite();
    return <div className="data-state" role="status">{loading ? <><span className="loading-line"/>{t("Loading market context…", "正在读取市场信息…", "시장 정보를 불러오는 중…")}</> : <><h2>{t("The data service is unavailable.", "数据服务暂不可用。", "데이터 서비스를 이용할 수 없습니다.")}</h2><p>{t("No demo values have been substituted for a failed request.", "不会把请求失败的数据替换成演示数值。", "실패한 요청을 데모 값으로 대체하지 않습니다.")}</p>{error && <button className="button secondary" onClick={reload}>{t("Retry", "重试", "다시 시도")}</button>}</>}</div>;
}
function Mode({ mode }: {
    mode?: string;
}) { const { t } = useSite(); return <span className="mode-badge">{mode === "demo" ? t("DEMO · NOT LIVE PRICES", "DEMO · 非实时行情", "DEMO · 실시간 시세 아님") : mode === "live-readonly" ? t("LIVE SOURCE · READ ONLY", "实时来源 · 只读", "실시간 출처 · 읽기 전용") : t("CONNECTING", "连接中", "연결 중")}</span>; }
export default function Assets() {
    const { href, t } = useSite();
    const { data, error, loading, reload } = useCatalog();
    const [query, setQuery] = useState(""), [issuer, setIssuer] = useState("all"), [status, setStatus] = useState("all"), [grouped, setGrouped] = useState(true), [sort, setSort] = useState("ticker"), [ascending, setAscending] = useState(true), [page, setPage] = useState(0), [pageSize, setPageSize] = useState(50);
    const all = data?.view.items ?? [];
    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = all.filter(a => (issuer === "all" || a.issuer.id === issuer) && (status === "all" || (a.market?.marketStatus ?? "unknown").toLowerCase() === status) && [a.underlying.ticker, a.underlying.name, a.token.symbol, a.token.contractAddress, a.issuer.name].some(s => s.toLowerCase().includes(q)));
        const groups: Asset[][] = [];
        for (const a of filtered) {
            const g = grouped ? groups.find(g => g[0].underlying.ticker === a.underlying.ticker) : undefined;
            if (g)
                g.push(a);
            else
                groups.push([a]);
        }
        return groups.sort((a, b) => { if (sort === "ticker")
            return a[0].underlying.ticker.localeCompare(b[0].underlying.ticker) * (ascending ? 1 : -1); const field = sort === "price" ? "tokenPrice" : sort === "gap" ? "priceGapPercent" : sort === "volume" ? "volume24H" : "marketCap"; const av = safeNumber(a[0].market?.[field]), bv = safeNumber(b[0].market?.[field]); if (av === undefined)
            return bv === undefined ? 0 : 1; if (bv === undefined)
            return -1; return (av - bv) * (ascending ? 1 : -1); });
    }, [all, query, issuer, status, grouped, sort, ascending]);
    useEffect(() => setPage(0), [query, issuer, status, grouped, sort, ascending, pageSize]);
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const current = Math.min(page, pages - 1);
    const visibleGroups = useMemo(() => rows.slice(current * pageSize, current * pageSize + pageSize), [rows, current, pageSize]);
    const visibleAssets = useMemo(() => visibleGroups.flat(), [visibleGroups]);
    const [priceSnapshots, setPriceSnapshots] = useState<Record<string, PriceSnapshot>>({}), [priceSnapshotError, setPriceSnapshotError] = useState(false), [priceSnapshotLoading, setPriceSnapshotLoading] = useState(false);
    const priceRequestKey = visibleAssets.map(a => `${a.issuer.id}:${a.token.contractAddress}`).join("|");
    useEffect(() => {
        if (!data || data.mode !== "live-readonly" || visibleAssets.length === 0) {
            setPriceSnapshots({});
            setPriceSnapshotError(false);
            setPriceSnapshotLoading(false);
            return;
        }
        const controller = new AbortController();
        setPriceSnapshots({});
        setPriceSnapshotError(false);
        setPriceSnapshotLoading(true);
        (async () => {
            const chunks: Asset[][] = [];
            for (let offset = 0; offset < visibleAssets.length; offset += 100) chunks.push(visibleAssets.slice(offset, offset + 100));
            const responses = await Promise.all(chunks.map(async chunk => {
                const query = new URLSearchParams({ chainId: "56" });
                for (const asset of chunk) query.append("representation", `${asset.issuer.id}:${asset.token.contractAddress}`);
                const response = await fetch("/api/asset-prices?" + query.toString(), { signal: controller.signal });
                if (!response.ok) throw Error("Timestamped prices unavailable");
                const payload = await response.json() as { view?: { items?: PriceSnapshot[] } };
                if (!Array.isArray(payload.view?.items)) throw Error("Invalid timestamped price response");
                return payload.view.items;
            }));
            if (controller.signal.aborted) return;
            const next: Record<string, PriceSnapshot> = {};
            for (const item of responses.flat()) next[`${item.chainId}:${item.platformId.toLowerCase()}:${/^0x[a-fA-F0-9]{40}$/.test(item.contractAddress) ? item.contractAddress.toLowerCase() : item.contractAddress}`] = item;
            setPriceSnapshots(next);
        })().catch(() => { if (!controller.signal.aborted) setPriceSnapshotError(true); }).finally(() => { if (!controller.signal.aborted) setPriceSnapshotLoading(false); });
        return () => controller.abort();
    }, [data?.mode, data?.view.items, visibleAssets, priceRequestKey]);
    function changeSort(key: string) { if (sort === key)
        setAscending(!ascending);
    else {
        setSort(key);
        setAscending(true);
    } }
    function snapshotFor(asset: Asset) { return priceSnapshots[`${asset.token.chainId}:${asset.issuer.id.toLowerCase()}:${/^0x[a-fA-F0-9]{40}$/.test(asset.token.contractAddress) ? asset.token.contractAddress.toLowerCase() : asset.token.contractAddress}`]; }
    function marketFor(asset: Asset): Market | undefined { return marketForQuoteDisplay(asset.market, snapshotFor(asset), data?.mode === "live-readonly"); }
    function marketForTableRow(_group: Asset[], asset: Asset): Market | undefined { return marketFor(asset); }
    function range(group: Asset[], key: "tokenPrice" | "priceGapPercent" | "volume24H" | "marketCap") { const values = group.map(a => safeNumber(marketForTableRow(group, a)?.[key])).filter((n): n is number => n !== undefined); if (!values.length)
        return "—"; const format = key === "tokenPrice" ? money : key === "priceGapPercent" ? pct : compactMoney; const min = Math.min(...values), max = Math.max(...values); return min === max ? format(String(min)) : `${format(String(min))} – ${format(String(max))}`; }
    function quoteTime(group: Asset[]) { if (data?.mode === "demo") return t("Demo data", "演示数据", "데모 데이터"); const snapshots = group.map(snapshotFor); const timestamped = timestampedQuoteCount(snapshots); if (grouped) { if (priceSnapshotLoading) return t("Loading…", "加载中…", "불러오는 중…"); if (priceSnapshotError) return t("Unavailable", "暂不可用", "사용 불가"); return `${timestamped}/${group.length} ${t("timestamped", "有更新时间", "시간 확인됨")}`; } const quote = snapshots[0]; if (hasTimestampedQuote(quote)) return new Date(quote.tokenPriceUpdatedAt).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z"); if (priceSnapshotLoading) return t("Loading…", "加载中…", "불러오는 중…"); if (priceSnapshotError || quote?.state === "unavailable") return t("Unavailable", "暂不可用", "사용 불가"); if (quote?.state === "ambiguous" || quote?.state === "invalid") return t("Unverified", "未能验证", "확인되지 않음"); return t("Not supplied", "未提供", "제공되지 않음"); }
    const sortLabel = (key: string, en: string, zh: string, ko: string) => <button onClick={() => changeSort(key)}>{t(en, zh, ko)} <span aria-hidden="true">{sort === key ? ascending ? "↑" : "↓" : "↕"}</span></button>;
    const sourceTimestamp = data?.view.provenance?.sourceResponseTimestampMs;
    const sourceTimeLabel = sourceTimestamp ? `${new Date(sourceTimestamp).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z")} UTC` : undefined;
    const platformTimestamp = data?.view.provenance?.platformMetadataResponseTimestampMs;
    const platformSourceTimeLabel = platformTimestamp ? `${new Date(platformTimestamp).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z")} UTC` : undefined;
    const sourceTimestampFootnote = data?.mode === "demo"
        ? <><br/><small>{t("Demo catalog · no upstream response timestamps", "演示目录 · 无上游响应时间", "데모 카탈로그 · 업스트림 응답 시각 없음")}</small><br/><small>{t("Counts describe this response; ticker values are raw source strings, not normalized securities. Response size does not prove complete market coverage.", "计数仅代表本次响应；不同代码值是来源原始字符串，不等于规范化后的证券数量。响应条数不证明市场覆盖完整。", "집계는 이 응답에 한정됩니다. 티커 값은 정규화된 증권 수가 아니며, 응답 규모가 전체 시장 범위를 증명하지 않습니다.")}</small></>
        : <>
            <br/><small>{sourceTimeLabel ? <>{t("Catalog API response time (not per-token price time): ", "资产目录接口响应时间（非单个代币行情时间）：", "자산 카탈로그 응답 시각(개별 토큰 가격 시각 아님): ")}{sourceTimeLabel}</> : t("Catalog API response time was not supplied.", "来源未提供资产目录接口响应时间。", "자산 카탈로그 응답 시각이 제공되지 않았습니다.")}</small>
            <br/><small>{platformSourceTimeLabel ? <>{t("Platform count metadata response time: ", "平台计数元数据响应时间：", "플랫폼 수 메타데이터 응답 시각: ")}{platformSourceTimeLabel}</> : t("Platform count metadata response time was not supplied.", "来源未提供平台计数元数据响应时间。", "플랫폼 수 메타데이터 응답 시각이 제공되지 않았습니다.")}</small>
            <br/><small>{t("Counts describe this response; ticker values are raw source strings, not normalized securities. Response size does not prove complete market coverage.", "计数仅代表本次响应；不同代码值是来源原始字符串，不等于规范化后的证券数量。响应条数不证明市场覆盖完整。", "집계는 이 응답에 한정됩니다. 티커 값은 정규화된 증권 수가 아니며, 응답 규모가 전체 시장 범위를 증명하지 않습니다.")}</small>
        </>;
    return <main id="main" className="workspace asset-workspace shell"><div className="workspace-top"><div><span className="eyebrow">ARIADNE / {t("ASSET DIRECTORY", "资产目录", "자산 디렉터리")}</span><h1>{t("Explore the onchain market.", "探索链上市场。", "온체인 시장을 탐색하세요.")}</h1><p>{t("Underlying first. Every available representation, with its issuer and market context.", "从底层标的出发，查看当前来源提供的每种链上表示、发行方与市场信息。", "기초자산을 기준으로 현재 제공되는 온체인 표현과 발행사, 시장 정보를 확인하세요.")}</p></div><Mode mode={data?.mode}/></div>
 <div className="workspace-stats">{[[data?.view.summary.distinctTickerValues, t("Ticker values", "不同代码值", "티커 값")], [data?.view.summary.totalRepresentations, t("Representations", "种链上表示", "온체인 표현")], [data?.view.summary.issuerCount, t("Issuers", "个发行方", "발행사")]].map(([n, label]) => <div key={label}><strong>{loading || error ? "—" : n}</strong><span>{label}</span></div>)}<div><strong>BNB</strong><span>{t("Current catalog · Chain 56", "当前目录 · Chain 56", "현재 디렉터리 · Chain 56")}</span></div></div>
 <section className="terminal"><div className="terminal-heading"><div><span className="eyebrow">MARKET / 56</span><h2>{t("Tokenized stocks & ETFs", "代币化股票与 ETF", "토큰화 주식과 ETF")}</h2></div><button className="text-link" onClick={reload}>{t("Refresh ↻", "刷新 ↻", "새로고침 ↻")}</button></div><div className="terminal-tools"><label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("Asset, symbol, issuer or contract…", "标的、代码、发行方或合约地址…", "자산, 코드, 발행사 또는 계약 주소…")} aria-label={t("Search assets", "搜索资产", "자산 검색")}/>{query && <button onClick={() => setQuery("")} aria-label={t("Clear search", "清空搜索", "검색 지우기")}>×</button>}</label><select aria-label={t("Issuer", "发行方", "발행사")} value={issuer} onChange={e => setIssuer(e.target.value)}><option value="all">{t("All issuers", "全部发行方", "모든 발행사")}</option>{Array.from(new Map(all.map(a => [a.issuer.id, a.issuer.name]))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select aria-label={t("Market state", "市场状态", "시장 상태")} value={status} onChange={e => setStatus(e.target.value)}><option value="all">{t("All states", "全部状态", "모든 상태")}</option><option value="open">{t("Open", "开放", "개장")}</option><option value="closed">{t("Closed", "关闭", "폐장")}</option><option value="unknown">{t("Unknown", "未知", "알 수 없음")}</option></select></div><div className="view-switch"><div><button aria-pressed={grouped} onClick={() => { setGrouped(true); setSort("ticker"); }}>{t("By underlying", "按标的", "기초자산별")}</button><button aria-pressed={!grouped} onClick={() => setGrouped(false)}>{t("By representation", "按链上表示", "온체인 표현별")}</button></div><span>{rows.length} {t("results", "项结果", "개 결과")}</span></div>
 {loading || error ? <DataState loading={loading} error={error} reload={reload}/> : <><div className="table-scroll" tabIndex={0} aria-label={t("Asset table", "资产表格", "자산 표")}><table className="asset-table"><thead><tr><th aria-sort={sort === "ticker" ? (ascending ? "ascending" : "descending") : "none"}>{sortLabel("ticker", "Underlying", "底层标的", "기초자산")}</th><th>{grouped ? t("Representations", "链上表示", "온체인 표현") : t("Token", "代币", "토큰")}</th><th>{t("Issuer", "发行方", "발행사")}</th><th aria-sort={sort === "price" ? (ascending ? "ascending" : "descending") : "none"}>{sortLabel("price", "Token price", "代币价格", "토큰 가격")}</th><th>{t("Reference", "参考价格", "참조 가격")}</th><th aria-sort={sort === "gap" ? (ascending ? "ascending" : "descending") : "none"}>{sortLabel("gap", "Price gap", "参考价差", "가격 차이")}</th><th aria-sort={sort === "volume" ? (ascending ? "ascending" : "descending") : "none"}>{sortLabel("volume", "24h volume", "24h 成交量", "24시간 거래량")}</th><th aria-sort={sort === "cap" ? (ascending ? "ascending" : "descending") : "none"}>{sortLabel("cap", "Market cap", "市值", "시가총액")}</th><th>{t("State", "状态", "상태")}</th><th>{t("Quote updated", "报价更新时间", "시세 업데이트")}</th><th /></tr></thead><tbody>{visibleGroups.map(group => { const a = group[0]; const state = group.every(x => x.market?.marketStatus === "open") ? "open" : group.every(x => x.market?.marketStatus === "closed") ? "closed" : "unknown"; return <tr key={grouped ? a.underlying.ticker : a.id}><td><Link className="asset-name" href={href("/assets/" + encodeURIComponent(a.underlying.ticker))}><Logo asset={a}/><span><strong>{a.underlying.ticker}</strong><small>{a.underlying.name}</small></span></Link></td><td>{grouped ? <span className="count-pill">{group.length}</span> : a.token.symbol}</td><td>{Array.from(new Set(group.map(a => a.issuer.name))).join(" / ")}</td><td className="numeric">{range(group, "tokenPrice")}</td><td className="numeric">{grouped && group.length > 1 ? "—" : money(marketFor(a)?.referencePrice)}</td><td className="numeric">{range(group, "priceGapPercent")}</td><td className="numeric">{range(group, "volume24H")}</td><td className="numeric">{range(group, "marketCap")}</td><td><span className={state === "open" ? "state-open" : "state-unknown"}>{state === "open" ? t("Open", "开放", "개장") : state === "closed" ? t("Closed", "关闭", "폐장") : group.length > 1 ? t("Unknown / mixed", "未知 / 混合", "알 수 없음 / 혼합") : t("Unknown", "未知", "알 수 없음")}</span></td><td><small>{quoteTime(group)}</small></td><td><Link href={href("/assets/" + encodeURIComponent(a.underlying.ticker))} aria-label={t("Research ", "研究 ", "리서치 ") + a.underlying.ticker}>↗</Link></td></tr>; })}</tbody></table></div>{data.view.pagination.hasMore && <p className="inline-notice" role="status">{t(`Showing ${data.view.pagination.returned} of ${data.view.summary.totalRepresentations} source-returned representations; the local safety limit was reached.`, `当前仅显示来源返回的 ${data.view.pagination.returned} / ${data.view.summary.totalRepresentations} 条表示，已达到本地安全上限。`, `로컬 안전 한도에 도달해 소스 반환 표현 ${data.view.pagination.returned}/${data.view.summary.totalRepresentations}개만 표시합니다.`)}</p>}{rows.length === 0 && <div className="data-state">{t("No matching assets. Try another search or filter.", "没有匹配的资产，请更换关键词或筛选条件。", "일치하는 자산이 없습니다. 검색 또는 필터를 변경하세요.")}</div>}<div className="pagination"><span>{rows.length ? current * pageSize + 1 : 0}–{Math.min(rows.length, (current + 1) * pageSize)} / {rows.length}</span><label>{t("Rows", "每页", "페이지당")} <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label={t("Rows per page", "每页行数", "페이지당 행 수")}>{[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}</select></label><button disabled={current === 0} onClick={() => setPage(current - 1)}>{t("Previous", "上一页", "이전")}</button><button disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>{t("Next", "下一页", "다음")}</button></div></>}
 </section><p className="data-footnote">{t("Scope: tokenized stocks and ETFs actually returned by the connected source on BNB Chain. Platform metadata is not counted as listed assets. Other RWA sectors and chains are not claimed here. Prices and gaps are source fields, not executable quotes; missing values are not zero. Asset marks identify underlyings, not partnerships.", "范围：当前来源在 BNB Chain 实际返回的代币化股票与 ETF。平台元数据不计为已陈列资产；此处不宣称覆盖其他 RWA 类别或链。价格和价差不是可执行报价，缺失值不等于零；标的标识不代表合作。", "범위: 현재 소스가 BNB Chain에서 실제로 반환한 토큰화 주식과 ETF입니다. 다른 RWA 유형과 체인은 포함한다고 주장하지 않습니다. 가격은 실행 가능한 견적이 아니며 누락 값은 0이 아닙니다.")}{sourceTimestampFootnote}</p></main>;
}
export function AssetDetail({ ticker }: {
    ticker: string;
}) {
    const { href, t, lang } = useSite();
    const { data, error, loading, reload } = useCatalog();
    const [research, setResearch] = useState<Research | null>(null), [researchState, setResearchState] = useState("loading"), [attempt, setAttempt] = useState(0);
    useEffect(() => { const abort = new AbortController(); setResearch(null); setResearchState("loading"); fetch("/api/asset-research?chainId=56&query=" + encodeURIComponent(ticker), { signal: abort.signal }).then(async (r) => { if (!r.ok)
        throw Error(); const body: Research = await r.json(); if (!body.view?.representations)
        throw Error(); setResearch(body); setResearchState(body.view.representations.length ? "ready" : "empty"); }).catch(() => { if (!abort.signal.aborted)
        setResearchState("error"); }); return () => abort.abort(); }, [ticker, attempt]);
    const assets = data?.view.items.filter(a => a.underlying.ticker.toLowerCase() === ticker.toLowerCase()) ?? [];
    const first = assets[0];
    return <main id="main" className="workspace shell asset-detail-workspace"><Link className="breadcrumb" href={href("/assets")}>← {t("All assets", "全部资产", "모든 자산")}</Link>{loading || error ? <DataState loading={loading} error={error} reload={reload}/> : !first ? <div className="data-state"><h1>{t("Asset not found", "未找到资产", "자산을 찾을 수 없습니다")}</h1><p>{ticker}</p></div> : <><div className="workspace-top detail-hero"><div className="detail-identity"><Logo asset={first}/><div><span className="eyebrow">{first.underlying.ticker} / BNB CHAIN</span><h1>{first.underlying.name}</h1></div></div><Mode mode={data?.mode}/></div><div className="detail-nav"><a href="#market">{t("Market workspace", "市场工作台", "시장 워크스페이스")}</a><a href="#representations">{t("Issuer comparison", "发行方比较", "발행사 비교")}</a><a href="#evidence">{t("Evidence & boundaries", "证据与边界", "근거 및 경계")}</a></div>
 <AssetWorkbench assets={assets} mode={data?.mode ?? "demo"} />
 <section id="representations" className="detail-section"><div className="terminal-heading"><h2>{t("One underlying. Read every representation.", "同一底层公司，逐一对照。", "하나의 기초 기업. 각각의 표현을 비교하세요.")}</h2><span>{assets.length} {t("representations", "种表示", "개 표현")}</span></div>
 {researchState !== "ready" && <p className="inline-notice" role="status">{researchState === "loading" ? t("Loading additional research evidence…", "正在读取补充研究证据…", "추가 리서치 근거를 불러오는 중…") : researchState === "empty" ? t("Catalog data is available. This research service has no additional evidence for this company; no details have been invented.", "目录数据可用；当前研究服务没有这家公司的补充证据，不会补造详情。", "카탈로그 데이터는 있지만 이 기업의 추가 리서치 근거는 없습니다.") : t("Additional research is unavailable. Catalog evidence remains below.", "补充研究暂不可用，以下保留目录证据。", "추가 리서치를 이용할 수 없습니다. 아래 카탈로그 근거를 확인하세요.")}{researchState === "error" && <button onClick={() => setAttempt(v => v + 1)}>{t("Retry", "重试", "다시 시도")}</button>}</p>}
 <div className="comparison-grid">{assets.map(a => { const enriched = research?.view.representations.find(r => r.id === a.id); const m = enriched?.market ?? a.market; return <article key={a.id} className="comparison-card"><div className="comparison-top"><span>{a.issuer.name}</span><small>BNB Chain</small></div><h3>{a.token.symbol}</h3><div className="big-price">{money(m?.tokenPrice)}<small>USD</small></div><dl>{[[t("Reference price", "参考价格", "참조 가격"), money(m?.referencePrice)], [t("Reference gap", "参考价差", "참조가 차이"), pct(m?.priceGapPercent)], [t("Market state", "市场状态", "시장 상태"), m?.marketStatus === "open" ? t("Open", "开放", "개장") : m?.marketStatus === "closed" ? t("Closed", "关闭", "폐장") : t("Unknown", "未知", "알 수 없음")], [t("Liquidity", "流动性", "유동성"), money(m?.liquidity)], [t("Source time", "来源时间", "출처 시간"), data?.mode === "demo" ? t("Demo snapshot", "演示快照", "데모 스냅샷") : (m?.updatedAt ?? m?.tokenPriceUpdatedAt) ? new Date((m?.updatedAt ?? m?.tokenPriceUpdatedAt)!).toLocaleString(lang === "zh" ? "zh-CN" : lang === "ko" ? "ko-KR" : "en-US") : t("Not supplied", "未提供", "제공되지 않음")]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="contract"><small>{t("Contract", "合约", "계약")}</small><code>{a.token.contractAddress}</code><a href={"https://bscscan.com/token/" + encodeURIComponent(a.token.contractAddress)} target="_blank" rel="noreferrer">{t("View on explorer", "在区块浏览器查看", "탐색기에서 보기")} ↗</a></div><details><summary>{t("Source warnings & gaps", "来源警告与缺口", "출처 경고 및 공백")}</summary><ul>{(enriched?.evidence.warnings ?? m?.dataWarnings ?? [t("No warning fields supplied.", "未提供警告字段。", "경고 필드가 없습니다.")]).map((w, i) => <li key={i}>{w}</li>)}{enriched?.evidence.missingFields.map(f => <li key={f}>{t("Missing: ", "缺失：", "누락: ")}{f}</li>)}</ul><small>{t("Source messages are preserved in their original language.", "来源消息保留原文。", "출처 메시지는 원문 그대로 표시됩니다.")}</small></details></article>; })}</div></section>
 <section id="evidence" className="boundary-panel"><span className="eyebrow">{t("EVIDENCE, NOT ASSUMPTIONS", "以证据为准，不作推测", "추측이 아닌 근거")}</span><h2>{t("Know what the data says. And where it stops.", "知道数据说了什么，也知道它止于哪里。", "데이터의 의미와 한계를 확인하세요.")}</h2><p>{t("Catalog and research values come from the connected Ariadne read-only service. Their coverage can differ. Reference gaps are not a recommendation or a guarantee of execution. This page does not request signatures or broadcast transactions.", "目录与研究数据来自已连接的 Ariadne 只读服务，两者覆盖范围可能不同。参考价差不是投资建议，也不保证可执行。本页不请求签名或广播交易。", "카탈로그와 리서치의 데이터 범위는 다를 수 있습니다. 참조가 차이는 투자 권유나 실행 보장이 아닙니다. 이 페이지는 서명이나 거래 브로드캐스트를 요청하지 않습니다.")}</p><Link className="text-link" href={href("/docs/data")}>{t("Read the data contract", "了解数据约定", "데이터 계약 읽기")} ↗</Link></section></>}</main>;
}
