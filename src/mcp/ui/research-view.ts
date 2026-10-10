import { inferOutputLanguage, localizeEvidenceMessage, type OutputLanguage } from "../../presentation/language.js";
import { hasMarketStateConflict, normalizeProviderTimestamp } from "../../domain/normalizers.js";

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "Not available") =>
  value === undefined || value === null || value === "" ? fallback : String(value);
const escapeHtml = (value: unknown) => text(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
})[character]!);

function displayTimestamp(value: unknown, language: OutputLanguage): string {
  const timestamp = normalizeProviderTimestamp(value);
  if (timestamp === undefined) return language === "zh-CN" ? "未提供来源时间戳" : "No source timestamp supplied";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? language === "zh-CN" ? "未提供来源时间戳" : "No source timestamp supplied" : date.toISOString().replace("T", " · ").replace("Z", " UTC");
}

function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function evidenceDetails(asset: UnknownRecord, quality: UnknownRecord, market: UnknownRecord, warnings: string[], language: OutputLanguage): string {
  const zh = language === "zh-CN";
  const coverage = record(quality.coverage);
  const provenance = list(market.provenance).map(record);
  const contract = text(asset.contractAddress);
  const chain = text(asset.chainName || asset.chainId, "Chain not supplied");
  const platform = text(asset.platformId, "Platform not supplied");
  const links = list(asset.links).map(record).flatMap((link) => {
    const href = safeHttpUrl(link.url);
    if (!href) return [];
    return [`<a class="source-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || "Source")} ↗</a>`];
  });
  const provenanceMarkup = provenance.length
    ? provenance.map((source) => `<li><span>${escapeHtml(source.provider)} · ${escapeHtml(source.endpoint)}</span><small>${zh ? "字段" : "Fields"}: ${escapeHtml(list(source.fields).join(", ") || (zh ? "未指定" : "not specified"))} · ${zh ? "响应时间" : "Response"} ${escapeHtml(displayTimestamp(source.responseTimestampMs, language))}</small></li>`).join("")
    : `<li><span>${zh ? "未提供来源详情" : "Source details were not supplied"}</span><small>${zh ? "不会自行推断提供方和接口。" : "Provider and endpoint are not inferred."}</small></li>`;
  const marketDetails = marketDetailMarkup(market, language);
  const warningsMarkup = warnings.length
    ? `<ul class="evidence-list evidence-warnings">${warnings.map((warning) => `<li>${escapeHtml(localizeEvidenceMessage(warning, language))}</li>`).join("")}</ul>`
    : `<p class="quiet">${zh ? "所提供的数据未报告警告。" : "No warnings reported by the supplied data."}</p>`;
  const coverageSummary = zh
    ? `身份 ${text(coverage.identity, "未知")} · 行情信息 ${text(coverage.marketContext, "未知")}`
    : `Identity ${text(coverage.identity, "unknown")} · market context ${text(coverage.marketContext, "unknown")}`;
  return `<details class="evidence">
    <summary><span>${zh ? "来源与数据质量" : "Sources &amp; data quality"}</span><span class="evidence-summary-meta">${escapeHtml(coverageSummary)}</span></summary>
    <div class="evidence-body">
      <section><h4>${zh ? "发行方版本" : "Representation"}</h4><p class="quiet">${escapeHtml(chain)} · ${escapeHtml(platform)}</p><code class="contract-address">${escapeHtml(contract)}</code><h4>${zh ? "数据注意事项" : "Data caveats"}</h4>${warningsMarkup}<h4>${zh ? "缺失字段" : "Missing fields"}</h4><p class="quiet">${escapeHtml(list(quality.missingFields).join(", ") || (zh ? "未报告" : "None reported"))}</p></section>
      ${marketDetails}
      <section><h4>${zh ? "数据来源" : "Provenance"}</h4><ul class="evidence-list provenance-list">${provenanceMarkup}</ul>${links.length ? `<div class="links">${links.join("")}</div>` : ""}</section>
    </div>
  </details>`;
}

function marketStatusPresentation(market: UnknownRecord, language: OutputLanguage): { label: string; accessibleLabel: string } {
  const status = text(market.marketStatus, "unknown");
  const normalizedStatus = status === "open" || status === "closed" || status === "offhours" ? status : "unknown";
  const openState = typeof market.openState === "boolean" ? market.openState : undefined;
  if (hasMarketStateConflict(normalizedStatus, openState)) {
    return language === "zh-CN"
      ? { label: "非开放", accessibleLabel: "非开放（上游状态字段矛盾）" }
      : { label: "Not open", accessibleLabel: "Not open (provider status fields conflict)" };
  }
  if (language === "zh-CN") {
    if (status === "closed") return { label: "已休市", accessibleLabel: "已休市" };
    if (status === "offhours") return { label: "非正常交易时段", accessibleLabel: "非正常交易时段" };
    if (status === "open") return { label: "开放", accessibleLabel: "开放" };
    if (market.openState === true) return { label: "未知", accessibleLabel: "市场状态类别未知（上游报告当前可交易）" };
    return { label: "未知", accessibleLabel: "未知" };
  }
  if (status === "closed") return { label: "closed", accessibleLabel: "closed" };
  if (status === "offhours") return { label: "offhours", accessibleLabel: "offhours" };
  if (status === "open") return { label: "open", accessibleLabel: "open" };
  if (market.openState === true) return { label: "unknown", accessibleLabel: "market status category unknown (provider reports tradable)" };
  return { label: "unknown", accessibleLabel: "unknown" };
}

function assetTypeLabel(value: unknown, language: OutputLanguage): string | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return undefined;
  const zh = language === "zh-CN";
  const label = value === 1 ? (zh ? "股票" : "Stock") : value === 2 ? "Pre-IPO" : value === 3 ? "ETF" : (zh ? "未知类型" : "Unknown type");
  return `${label} (${value})`;
}

function sourceTimestamp(value: unknown): string | undefined {
  const timestamp = normalizeProviderTimestamp(value);
  return timestamp === undefined ? undefined : new Date(timestamp).toISOString();
}

function marketDetailMarkup(market: UnknownRecord, language: OutputLanguage): string {
  const zh = language === "zh-CN";
  const separator = zh ? "：" : ": ";
  const details = [
    ...(typeof market.providerMarketStatus === "string" ? [`${zh ? "上游状态" : "Provider status"}${separator}${market.providerMarketStatus}`] : []),
    ...(typeof market.openState === "boolean" ? [`${zh ? "上游开放标记" : "Provider open-state flag"}${separator}${market.openState}`] : []),
    ...(typeof market.reasonCode === "string" || typeof market.reasonCode === "number" ? [`${zh ? "原因代码" : "Reason code"}${separator}${market.reasonCode}`] : []),
    ...(typeof market.reasonMsg === "string" ? [`${zh ? "上游说明" : "Provider note"}${separator}${market.reasonMsg}`] : []),
    ...(market.volume24H !== undefined ? [`${zh ? "24 小时成交量" : "24h volume"}${separator}${market.volume24H}`] : []),
    ...(market.liquidity !== undefined ? [`${zh ? "上游流动性字段" : "Provider liquidity field"}${separator}${market.liquidity}`] : []),
    ...(typeof market.holders === "number" ? [`${zh ? "持有者数量字段" : "Provider holder-count field"}${separator}${market.holders}`] : []),
    ...([["nextOpenTime", zh ? "下次开放" : "Next open"], ["nextCloseTime", zh ? "下次收盘" : "Next close"]] as const).flatMap(([key, label]) => {
      const timestamp = sourceTimestamp(market[key]);
      return timestamp ? [`${label}${separator}${timestamp}`] : [];
    })
  ];
  return details.length
    ? `<section class="provider-market-details"><h4>${zh ? "上游市场状态详情" : "Provider market details"}</h4><ul class="evidence-list">${details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul></section>`
    : "";
}

function representationRow(assetValue: unknown, rowValue: unknown, index: number, language: OutputLanguage, showIssuerName = true): string {
  const zh = language === "zh-CN";
  const asset = record(assetValue);
  const row = record(rowValue);
  const issuer = record(asset.issuer);
  const market = record(asset.market);
  const quality = record(asset.dataQuality);
  const warnings = [...new Set([
    ...list(quality.warnings).filter((warning): warning is string => typeof warning === "string"),
    ...list(market.dataWarnings).filter((warning): warning is string => typeof warning === "string")
  ])];
  const excluded = list(row.excludedReasons).filter((reason): reason is string => typeof reason === "string").map((reason) => localizeEvidenceMessage(reason, language));
  const status = marketStatusPresentation(market, language);
  const syntheticBadge = record(asset.metadata).source === "synthetic"
    ? `<span class="demo-badge">${zh ? "Demo 合成数据" : "Synthetic demo data"}</span>`
    : "";
  const outcome = excluded.length
    ? `<span class="result-status result-status-muted">${zh ? "筛选范围外" : "Outside filters"}</span>`
    : `<span class="result-status">${zh ? "已纳入" : "In result"}${row.rank !== undefined ? ` · #${escapeHtml(row.rank)}` : ""}</span>`;

  return `<article class="representation" aria-label="${escapeHtml(issuer.name || asset.platformId || `Representation ${index + 1}`)}">
    <div class="representation-main">
      <div class="identity">
        <div class="issuer-line">${showIssuerName ? `<strong>${escapeHtml(issuer.name || asset.platformId || "Unknown issuer")}</strong>` : ""}${outcome}</div>
        ${syntheticBadge}
      <div class="token-line"><span class="token-symbol">${escapeHtml(asset.tokenSymbol || "Unknown token")}</span><span class="underlying">${escapeHtml(asset.underlyingName || asset.underlyingTicker || "Underlying asset not supplied")}</span></div>
        ${assetTypeLabel(asset.assetType, language) ? `<span class="asset-type-badge">${escapeHtml(assetTypeLabel(asset.assetType, language))}</span>` : ""}
      </div>
      <div class="market-values" aria-label="Market context">
        <div><span>${zh ? "代币价格" : "Token"}</span><strong>${escapeHtml(market.tokenPrice)}</strong></div>
        <div><span>${zh ? "参考价格" : "Reference"}</span><strong>${escapeHtml(market.referencePrice)}</strong></div>
        <div><span>${zh ? "价差" : "Gap"}</span><strong>${escapeHtml(market.priceGapPercent || market.priceGap)}</strong></div>
      </div>
      <span class="market-status" aria-describedby="market-status-description-${index}" title="${escapeHtml(status.accessibleLabel)}">${escapeHtml(status.label)}</span>
      <span class="visually-hidden" id="market-status-description-${index}">${escapeHtml(status.accessibleLabel)}</span>
      <span class="quote-time">${escapeHtml(displayTimestamp(market.tokenPriceUpdatedAt, language))}</span>
    </div>
    ${excluded.length ? `<p class="result-reason">${escapeHtml(excluded.join("；"))}</p>` : ""}
    ${evidenceDetails(asset, quality, market, warnings, language)}
  </article>`;
}

type ResearchItem = { asset: UnknownRecord; row: UnknownRecord };

function issuerKey(item: ResearchItem): string {
  const issuer = record(item.asset.issuer);
  return text(issuer.id || item.asset.platformId, "unknown-issuer").trim().toLowerCase();
}

function chainLabel(chainId: string, language: OutputLanguage): string {
  const names: Record<string, string> = { "56": "BSC", "1": "Ethereum", CT_501: "Solana" };
  if (names[chainId]) return names[chainId]!;
  return language === "zh-CN" ? `其他链（${chainId}）` : `Other chain (${chainId})`;
}

function hasMarketContext(item: ResearchItem): boolean {
  return record(record(item.asset.dataQuality).coverage).marketContext === "fetched";
}

function hasComparablePrices(item: ResearchItem): boolean {
  if (!hasMarketContext(item)) return false;
  const market = record(item.asset.market);
  const price = Number(market.tokenPrice);
  const reference = Number(market.referencePrice);
  return Number.isFinite(price) && price > 0 && Number.isFinite(reference) && reference > 0;
}

function itemIdentity(item: ResearchItem): string {
  return [issuerKey(item), text(item.asset.chainId), text(item.asset.contractAddress).toLowerCase()].join(":");
}

function uniqueResearchItems(items: ResearchItem[]): ResearchItem[] {
  const unique = new Map<string, ResearchItem>();
  for (const item of items) {
    const key = itemIdentity(item);
    const previous = unique.get(key);
    if (!previous || (!hasComparablePrices(previous) && hasComparablePrices(item))) unique.set(key, item);
  }
  return [...unique.values()];
}

function summarizedWarnings(items: ResearchItem[], suppliedWarnings: string[], language: OutputLanguage): string[] {
  const zh = language === "zh-CN";
  const allWarnings = [...new Set([
    ...suppliedWarnings,
    ...items.flatMap(({ asset }) => [
      ...list(record(asset.dataQuality).warnings),
      ...list(record(asset.market).dataWarnings),
      ...list(asset.collectionWarnings)
    ].filter((warning): warning is string => typeof warning === "string"))
  ])];
  const warnings: string[] = [];
  const unsupportedCount = items.filter((item) => !hasComparablePrices(item)).length;
  if (unsupportedCount) warnings.push(zh
    ? `${unsupportedCount} 个链上版本未从 Binance 官方 API 获得完整行情，本次不纳入价格比较。`
    : `${unsupportedCount} chain versions lack complete Binance API market data and are excluded from price comparison.`);
  if (allWarnings.some((warning) => /Demo Mode uses a limited synthetic sample|演示模式仅包含有限的合成样本/i.test(warning))) warnings.push(zh
    ? "演示模式仅包含有限的合成样本，并非完整的实时资产目录。"
    : "Demo Mode uses a limited synthetic sample and is not a complete live asset catalog.");
  if (items.some(({ asset }) => record(asset.metadata).source === "synthetic")) warnings.push(zh
    ? "本结果包含合成演示数据，并非实时行情。"
    : "This result contains synthetic Demo data, not live market data.");
  if (allWarnings.some((warning) => /catalog|complete catalog|complete universe|目录完整性|完整的实时资产目录|搜索结果仅为上游本次返回的匹配项|搜索和目录结果仅为上游本次返回的匹配项/i.test(warning))) warnings.push(zh
    ? "本次仅展示 Binance API 返回的匹配项；目录完整性、分页和总数规则尚未验证。"
    : "This shows Binance API matches; catalog completeness, pagination, and total-count semantics are unverified.");
  if (allWarnings.some((warning) => /freshness SLA|freshness/i.test(warning))) warnings.push(zh
    ? "来源时间不代表实时保证；尚未验证行情更新时效承诺。"
    : "Source timestamps do not guarantee real-time freshness; no update SLA is verified.");
  if (items.some(({ asset }) => record(asset.market).marketStatus === "unknown")) warnings.push(zh
    ? "部分发行方的市场状态类别未确认。"
    : "Market status is unconfirmed for some issuer representations.");
  if (allWarnings.some((warning) => /liquidity was not provided|liquidity.*not provided/i.test(warning))) warnings.push(zh
    ? "部分发行方未提供流动性数据。"
    : "Liquidity data is missing for some issuer representations.");
  return warnings;
}

function renderIssuerGroups(items: ResearchItem[], language: OutputLanguage): string {
  const zh = language === "zh-CN";
  const groups = new Map<string, ResearchItem[]>();
  for (const item of items) groups.set(issuerKey(item), [...(groups.get(issuerKey(item)) ?? []), item]);
  const comparableRows = items
    .filter(hasComparablePrices)
    .sort((a, b) => {
      const gapA = Number(String(record(a.asset.market).priceGapPercent ?? "").replace(/%$/, ""));
      const gapB = Number(String(record(b.asset.market).priceGapPercent ?? "").replace(/%$/, ""));
      return (Number.isFinite(gapA) ? Math.abs(gapA) : Number.POSITIVE_INFINITY) - (Number.isFinite(gapB) ? Math.abs(gapB) : Number.POSITIVE_INFINITY);
    });
  const ranks = new Map(comparableRows.map((item, index) => [itemIdentity(item), index + 1]));
  let rowIndex = 0;

  return [...groups.entries()].map(([key, issuerItems], groupIndex) => {
    const issuer = record(issuerItems[0]?.asset.issuer);
    const issuerName = text(issuer.name || issuerItems[0]?.asset.platformId, zh ? "未知发行方" : "Unknown issuer");
    const issuerRows = issuerItems
      .slice()
      .sort((a, b) => {
        const aRank = ranks.get(itemIdentity(a)) ?? Number.POSITIVE_INFINITY;
        const bRank = ranks.get(itemIdentity(b)) ?? Number.POSITIVE_INFINITY;
        return aRank - bRank;
      });
    const renderItem = (item: ResearchItem) => {
      const comparisonRow = { ...item.row, ...(ranks.has(itemIdentity(item)) ? { rank: ranks.get(itemIdentity(item)) } : { rank: undefined }) };
      return representationRow(item.asset, comparisonRow, rowIndex++, language, false);
    };
    const rows = issuerRows.slice(0, 3).map(renderItem).join("");
    const moreRows = issuerRows.length > 3
      ? `<details class="more-results"><summary>${zh ? `再显示 ${issuerRows.length - 3} 个该发行方版本` : `Show ${issuerRows.length - 3} more from this issuer`}</summary><div>${issuerRows.slice(3).map(renderItem).join("")}</div></details>`
      : "";
    return `<section class="issuer-group" data-issuer-group="${escapeHtml(key)}" aria-label="${escapeHtml(issuerName)}">
      <header class="issuer-group-heading"><strong>${escapeHtml(issuerName)}</strong><span>BSC</span></header>
      ${rows}${moreRows}
    </section>`;
  }).join("");
}

export function renderResearchView(payloadValue: unknown): string {
  const payload = record(payloadValue);
  const language = inferOutputLanguage(text(payload.query));
  const zh = language === "zh-CN";
  const comparison = record(payload.comparison);
  const rows = list(comparison.rows).map(record);
  const assets = list(payload.assets);
  const items = rows.length
    ? rows.map((row) => ({ asset: record(row.asset), row }))
    : assets.map((asset) => ({ asset: record(asset), row: {} }));
  const outcome = record(payload.outcome);
  const warnings = [...new Set([
    ...list(outcome.warnings).filter((warning): warning is string => typeof warning === "string").map((warning) => localizeEvidenceMessage(warning, language)),
    ...list(comparison.warnings).filter((warning): warning is string => typeof warning === "string").map((warning) => localizeEvidenceMessage(warning, language))
  ])];
  // The current competition release has Binance Web3 market coverage on BSC.
  // Filter defensively here too, so stale or malformed payloads cannot create
  // unsupported-chain tabs or misleading error rows in the UI.
  const uniqueItems = uniqueResearchItems(items.filter((item) => text(item.asset.chainId) === "56"));
  const compareChainId = uniqueItems.length ? "56" : undefined;
  const compareIssuerCount = new Set(uniqueItems.filter(hasComparablePrices).map(issuerKey)).size;
  const bscWarnings = warnings.filter((warning) => !/processing Binance official market data|处理 Binance 官方行情数据时发生错误/i.test(warning));
  const caveats = summarizedWarnings(uniqueItems, bscWarnings, language);
  const ticker = text(payload.resolvedQuery || comparison.underlyingTicker || payload.query, "Asset research");
  const status = text(outcome.status, "success");
  const statusLabel = (zh ? { success: "证据已就绪", warning: "请留意数据说明", blocked: "需要澄清", error: "暂时无法完成研究" } : { success: "Evidence ready", warning: "Review caveats", blocked: "Clarification needed", error: "Research unavailable" } as Record<string, string>)[status] ?? (zh ? "查询结果" : "Review result");
  const statusClass = status === "success" ? "status-good" : status === "blocked" || status === "error" ? "status-attention" : "status-warning";
  const issuerCount = new Set(uniqueItems.map(issuerKey)).size;
  const representations = uniqueItems.length
    ? renderIssuerGroups(uniqueItems, language)
    : `<div class="empty-result">${zh ? "没有识别到具体股票，因此没有请求发行方行情。请先浏览 BSC 链上股票目录，或明确一个股票代码或公司。" : "No specific stock was identified, so issuer market data was not requested. Browse the BSC catalog first or name a ticker or company."}</div>`;
  const warningsMarkup = caveats.length
    ? `<details class="result-caveats"><summary aria-label="${caveats.length} ${zh ? "条重点数据说明" : "key data caveats"}"><span class="caveat-icon" aria-hidden="true">!</span><span>${caveats.length}${zh ? " 条重点数据说明" : ` key data caveat${caveats.length === 1 ? "" : "s"}`}</span></summary><ul>${caveats.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></details>`
    : "";
  const timing = record(payload.timing);
  const timingNote = typeof timing.totalMs === "number" && Number.isFinite(timing.totalMs)
    ? `<span class="timing">${escapeHtml(Math.round(timing.totalMs))} ms</span>`
    : "";
  const summary = !uniqueItems.length
    ? zh ? "等待选择具体标的" : "Waiting for a specific underlying"
    : zh
    ? compareIssuerCount
      ? `${compareIssuerCount} 家发行方在 ${chainLabel(compareChainId!, language)} 有可比较行情${issuerCount !== compareIssuerCount ? ` · 共 ${issuerCount} 家发行方` : ""}`
      : `${issuerCount} 家发行方已返回，但没有同链可比较行情`
    : compareIssuerCount
      ? `${compareIssuerCount} issuers have comparable ${chainLabel(compareChainId!, language)} market data${issuerCount !== compareIssuerCount ? ` · ${issuerCount} issuers returned` : ""}`
      : `${issuerCount} issuers returned, but no same-chain comparable market data is available`;

  return `<main class="research-shell">
    <header class="result-heading">
      <div class="brandline"><span class="brand-thread" aria-hidden="true"></span><span class="brand-name">Ariadne</span><span class="brand-divider">·</span><span class="brand-context">${zh ? "研究 · Binance Web3 · BSC" : "Research · Binance Web3 · BSC"}</span></div>
      <span class="result-state ${statusClass}"><span class="state-dot" aria-hidden="true"></span>${escapeHtml(statusLabel)}</span>
    </header>
    <section class="result-intro" aria-label="${zh ? "研究结果" : "Research result"}">
      <h1>${escapeHtml(ticker)}</h1>
      <p>${escapeHtml(summary)}</p>
    </section>
    ${warningsMarkup}
    <section class="representations" aria-label="${zh ? "发行方版本" : "Issuer representations"}">${representations}</section>
    <footer class="result-footer"><span>${zh ? "仅供研究 · 不涉及钱包或交易操作" : "Research only · no wallet or trade action"}</span>${timingNote}</footer>
  </main>`;
}
