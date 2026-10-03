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

function marketStatusLabel(market: UnknownRecord, language: OutputLanguage): string {
  const status = text(market.marketStatus, "unknown");
  const normalizedStatus = status === "open" || status === "closed" || status === "offhours" ? status : "unknown";
  const openState = typeof market.openState === "boolean" ? market.openState : undefined;
  if (hasMarketStateConflict(normalizedStatus, openState)) {
    return language === "zh-CN" ? "非开放（上游状态字段矛盾）" : "Not open (provider status fields conflict)";
  }
  if (language === "zh-CN") {
    if (status === "closed") return "已休市";
    if (status === "offhours") return "非正常交易时段";
    if (status === "open") return "开放";
    if (market.openState === true) return "市场状态未知（上游报告开放标记，但未确认）";
    return "未知";
  }
  if (status === "closed") return "closed";
  if (status === "offhours") return "offhours";
  if (status === "open") return "open";
  return market.openState === true ? "market status unknown (provider open flag is unconfirmed)" : "unknown";
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

function representationRow(assetValue: unknown, rowValue: unknown, index: number, language: OutputLanguage): string {
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
  const status = marketStatusLabel(market, language);
  const syntheticBadge = record(asset.metadata).source === "synthetic"
    ? `<span class="demo-badge">${zh ? "Demo 合成数据" : "Synthetic demo data"}</span>`
    : "";
  const outcome = excluded.length
    ? `<span class="result-status result-status-muted">${zh ? "筛选范围外" : "Outside filters"}</span>`
    : `<span class="result-status">${zh ? "已纳入" : "In result"}${row.rank !== undefined ? ` · #${escapeHtml(row.rank)}` : ""}</span>`;

  return `<article class="representation" aria-label="${escapeHtml(issuer.name || asset.platformId || `Representation ${index + 1}`)}">
    <div class="representation-main">
      <div class="identity">
        <div class="issuer-line"><strong>${escapeHtml(issuer.name || asset.platformId || "Unknown issuer")}</strong>${outcome}</div>
        ${syntheticBadge}
      <div class="token-line"><span class="token-symbol">${escapeHtml(asset.tokenSymbol || "Unknown token")}</span><span class="underlying">${escapeHtml(asset.underlyingName || asset.underlyingTicker || "Underlying asset not supplied")}</span></div>
        ${assetTypeLabel(asset.assetType, language) ? `<span class="asset-type-badge">${escapeHtml(assetTypeLabel(asset.assetType, language))}</span>` : ""}
      </div>
      <div class="market-values" aria-label="Market context">
        <div><span>${zh ? "代币价格" : "Token"}</span><strong>${escapeHtml(market.tokenPrice)}</strong></div>
        <div><span>${zh ? "参考价格" : "Reference"}</span><strong>${escapeHtml(market.referencePrice)}</strong></div>
        <div><span>${zh ? "价差" : "Gap"}</span><strong>${escapeHtml(market.priceGapPercent || market.priceGap)}</strong></div>
      </div>
      <span class="market-status" aria-label="${zh ? "市场状态" : "Market status"}">${escapeHtml(status)}</span>
      <span class="quote-time">${escapeHtml(displayTimestamp(market.tokenPriceUpdatedAt, language))}</span>
    </div>
    ${excluded.length ? `<p class="result-reason">${escapeHtml(excluded.join("；"))}</p>` : ""}
    ${evidenceDetails(asset, quality, market, warnings, language)}
  </article>`;
}

export function renderResearchView(payloadValue: unknown): string {
  const payload = record(payloadValue);
  const language = inferOutputLanguage(text(payload.query));
  const zh = language === "zh-CN";
  const comparison = record(payload.comparison);
  const rows = list(comparison.rows).map(record);
  const assets = list(payload.assets);
  const items = rows.length
    ? rows.map((row) => ({ asset: row.asset, row }))
    : assets.map((asset) => ({ asset, row: {} }));
  const outcome = record(payload.outcome);
  const warnings = [...new Set([
    ...list(outcome.warnings).filter((warning): warning is string => typeof warning === "string").map((warning) => localizeEvidenceMessage(warning, language)),
    ...list(comparison.warnings).filter((warning): warning is string => typeof warning === "string").map((warning) => localizeEvidenceMessage(warning, language))
  ])];
  const ticker = text(payload.resolvedQuery || comparison.underlyingTicker || payload.query, "Asset research");
  const status = text(outcome.status, "success");
  const statusLabel = (zh ? { success: "证据已就绪", warning: "请留意数据说明", blocked: "需要澄清", error: "暂时无法完成研究" } : { success: "Evidence ready", warning: "Review caveats", blocked: "Clarification needed", error: "Research unavailable" } as Record<string, string>)[status] ?? (zh ? "查询结果" : "Review result");
  const statusClass = status === "success" ? "status-good" : status === "blocked" || status === "error" ? "status-attention" : "status-warning";
  const visibleItems = items.slice(0, 3);
  const additionalItems = items.slice(3);
  const representations = items.length
    ? `${visibleItems.map(({ asset, row }, index) => representationRow(asset, row, index, language)).join("")}${additionalItems.length
      ? `<details class="more-results"><summary>${zh ? `再显示 ${additionalItems.length} 个发行方版本` : `Show ${additionalItems.length} more representations`}</summary><div>${additionalItems.map(({ asset, row }, index) => representationRow(asset, row, index + 3, language)).join("")}</div></details>`
      : ""}`
    : `<div class="empty-result">${zh ? "没有返回发行方版本。请尝试更宽泛的股票代码或移除筛选条件。" : "No representation was returned. Try a broader ticker or remove filters."}</div>`;
  const warningsMarkup = warnings.length
    ? `<details class="result-caveats"><summary aria-label="${warnings.length} ${zh ? "条研究注意事项" : "research caveats"}"><span class="caveat-icon" aria-hidden="true">!</span><span>${warnings.length}${zh ? " 条数据注意事项" : ` research caveat${warnings.length === 1 ? "" : "s"}`}</span></summary><p>${warnings.map(escapeHtml).join(" · ")}</p></details>`
    : "";
  const timing = record(payload.timing);
  const timingNote = typeof timing.totalMs === "number" && Number.isFinite(timing.totalMs)
    ? `<span class="timing">${escapeHtml(Math.round(timing.totalMs))} ms</span>`
    : "";
  const summary = zh
    ? rows.length ? `${rows.filter((row) => !list(row.excludedReasons).length).length} / ${rows.length} 个发行方版本符合给定筛选条件` : text(payload.summary, `${items.length} 个发行方版本已返回`)
    : text(comparison.summary || payload.summary, `${items.length} issuer representations returned`);

  return `<main class="research-shell">
    <header class="result-heading">
      <div class="brandline"><span class="brand-thread" aria-hidden="true"></span><span class="brand-name">Ariadne</span><span class="brand-divider">·</span><span class="brand-context">${zh ? "研究" : "Research"}</span></div>
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
