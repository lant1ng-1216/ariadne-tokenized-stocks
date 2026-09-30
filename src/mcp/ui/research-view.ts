type UnknownRecord = Record<string, unknown>;
export type ResearchViewMode = "overview" | "representations";

const record = (value: unknown): UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "Not available") =>
  value === undefined || value === null || value === "" ? fallback : String(value);
const escapeHtml = (value: unknown) => text(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
})[character]!);

function displayTimestamp(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "No source timestamp supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No source timestamp supplied" : date.toISOString().replace("T", " · ").replace("Z", " UTC");
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

function assetCard(assetValue: unknown, rowValue: unknown, index: number): string {
  const asset = record(assetValue);
  const row = record(rowValue);
  const issuer = record(asset.issuer);
  const market = record(asset.market);
  const quality = record(asset.dataQuality);
  const coverage = record(quality.coverage);
  const warnings = [...new Set([
    ...list(quality.warnings).filter((warning): warning is string => typeof warning === "string"),
    ...list(market.dataWarnings).filter((warning): warning is string => typeof warning === "string")
  ])];
  const provenance = list(market.provenance).map(record);
  const status = text(market.marketStatus, "unknown").replaceAll("_", " ");
  const excluded = list(row.excludedReasons).filter((reason): reason is string => typeof reason === "string");
  const links = list(asset.links).map(record).flatMap((link) => {
    const href = safeHttpUrl(link.url);
    if (!href) return [];
    return [`<a class="source-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || "Verified source")} ↗</a>`];
  });
  const contract = text(asset.contractAddress);
  const shortContract = contract.length > 22 ? `${contract.slice(0, 10)}…${contract.slice(-8)}` : contract;
  const warningMarkup = warnings.length
    ? `<ul class="warning-list">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
    : `<p class="quiet">No warnings reported by the supplied data.</p>`;
  const provenanceMarkup = provenance.length
    ? provenance.map((source) => `<li><span>${escapeHtml(source.provider)} · ${escapeHtml(source.endpoint)}</span><small>Fields: ${escapeHtml(list(source.fields).join(", ") || "not specified")} · Response ${escapeHtml(displayTimestamp(source.responseTimestampMs))}</small></li>`).join("")
    : `<li><span>Source details were not supplied</span><small>Do not infer provenance or quote freshness.</small></li>`;
  const eligibility = excluded.length
    ? `<span class="pill pill-muted">Not matched</span><p class="quiet">${escapeHtml(excluded.join("; "))}</p>`
    : `<span class="pill pill-good">Matched${row.rank !== undefined ? ` · rank ${escapeHtml(row.rank)}` : ""}</span>`;
  return `<article class="asset-card">
    <div class="asset-topline"><div><div class="eyebrow">REPRESENTATION ${String(index + 1).padStart(2, "0")}</div><h3>${escapeHtml(issuer.name || asset.platformId || "Unknown issuer")}</h3></div>${eligibility}</div>
    <div class="asset-identity"><strong>${escapeHtml(asset.tokenSymbol || "Unknown token")}</strong><span>${escapeHtml(asset.underlyingName || asset.underlyingTicker || "Underlying asset not supplied")}</span><code>${escapeHtml(shortContract)}</code></div>
    <div class="market-grid">
      <div class="value-cell"><span>Token price</span><strong>${escapeHtml(market.tokenPrice)}</strong></div>
      <div class="value-cell"><span>Reference price</span><strong>${escapeHtml(market.referencePrice)}</strong></div>
      <div class="value-cell"><span>Price gap</span><strong>${escapeHtml(market.priceGapPercent || market.priceGap)}</strong></div>
      <div class="value-cell"><span>Market status</span><strong class="status-text">${escapeHtml(status)}</strong></div>
    </div>
    <div class="freshness"><span class="freshness-dot"></span><span>Quote timestamp · ${escapeHtml(displayTimestamp(market.tokenPriceUpdatedAt))}</span></div>
    <details class="evidence"><summary>Evidence and data quality <span>Identity ${escapeHtml(coverage.identity || "unknown")} · market context ${escapeHtml(coverage.marketContext || "unknown")}</span></summary>
      <div class="evidence-body"><div><h4>Data warnings</h4>${warningMarkup}<h4>Missing fields</h4><p class="quiet">${escapeHtml(list(quality.missingFields).join(", ") || "None reported")}</p></div>
      <div><h4>Provenance</h4><ul class="provenance-list">${provenanceMarkup}</ul>${links.length ? `<div class="links">${links.join("")}</div>` : ""}</div></div>
    </details>
  </article>`;
}

export function renderResearchView(payloadValue: unknown, mode: ResearchViewMode = "overview"): string {
  const payload = record(payloadValue);
  const comparison = record(payload.comparison);
  const rows = list(comparison.rows).map(record);
  const assets = list(payload.assets);
  const items = rows.length
    ? rows.map((row) => ({ asset: row.asset, row }))
    : assets.map((asset) => ({ asset, row: {} }));
  const warnings = [...new Set([
    ...list(record(payload.outcome).warnings).filter((warning): warning is string => typeof warning === "string"),
    ...list(comparison.warnings).filter((warning): warning is string => typeof warning === "string")
  ])];
  const ticker = text(payload.resolvedQuery || comparison.underlyingTicker || payload.query, "Asset research");
  const eligibleCount = rows.length ? rows.filter((row) => !list(row.excludedReasons).length).length : items.length;
  const status = text(record(payload.outcome).status, "success");
  const statusLabel = ({ success: "Evidence ready", warning: "Review data gaps", blocked: "Clarification needed", error: "Research unavailable" } as Record<string, string>)[status] ?? "Review result";
  const viewContent = mode === "representations"
    ? `<section class="cards">${items.length ? items.map(({ asset, row }, index) => assetCard(asset, row, index)).join("") : `<div class="empty">No representations were returned for this request.</div>`}</section>`
    : `<section class="overview-grid">
        <div class="overview-card"><div class="eyebrow">COMPARISON</div><h2>${escapeHtml(ticker)}</h2><p>${escapeHtml(comparison.summary || payload.summary || "Evidence-backed asset research")}</p><div class="inline-stats"><span><strong>${items.length}</strong> representations</span><span><strong>${eligibleCount}</strong> matched current criteria</span></div></div>
        <div class="overview-card status-card"><div class="eyebrow">RESEARCH STATUS</div><span class="pill ${status === "success" ? "pill-good" : status === "blocked" || status === "error" ? "pill-danger" : "pill-warn"}">${escapeHtml(statusLabel)}</span><p>Ranking and eligibility reflect only the supplied preferences and observed evidence; neither is an investment recommendation.</p></div>
      </section>
      <section class="preview-list"><div class="section-head"><div><div class="eyebrow">ISSUER SNAPSHOT</div><h2>Representations in this result</h2></div><span>${items.length} returned</span></div>${items.slice(0, 3).map(({ asset, row }, index) => assetCard(asset, row, index)).join("") || `<div class="empty">No matching representation was returned. Try a broader ticker or remove filters.</div>`}</section>`;
  const warningPanel = warnings.length
    ? `<section class="warnings"><div class="eyebrow">DATA CAVEATS</div><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></section>`
    : "";
  const timing = record(payload.timing);
  const timingNote = typeof timing.totalMs === "number" && Number.isFinite(timing.totalMs)
    ? `<span>Request processing ${escapeHtml(Math.round(timing.totalMs))} ms</span>`
    : "";
  return `<main class="research-shell">
    <header class="topbar"><div class="brand-mark">A</div><div class="brand"><strong>ARIADNE</strong><span>MARKET CONTEXT</span></div><span class="read-only-label"><i></i>READ-ONLY RESEARCH</span></header>
    <section class="title-block"><div class="eyebrow">ASSET RESEARCH · ${escapeHtml(ticker)}</div><h1>${escapeHtml(payload.summary || "Evidence, kept in context.")}</h1><p>Compare issuer representations without hiding their differences. Prices, timestamps and caveats below are shown only when supplied by the MCP result.</p></section>
    <nav class="view-tabs" aria-label="Research views"><button type="button" data-view="overview" class="${mode === "overview" ? "active" : ""}" aria-pressed="${mode === "overview"}">Overview</button><button type="button" data-view="representations" class="${mode === "representations" ? "active" : ""}" aria-pressed="${mode === "representations"}">All representations <span>${items.length}</span></button></nav>
    ${viewContent}
    ${warningPanel}
    <footer class="boundary"><div class="boundary-icon">i</div><p><strong>Research only.</strong> This view does not make an investment decision, request wallet access, sign a transaction or place an order.</p><div class="timing">${timingNote}<span>Source timestamps are not a freshness guarantee.</span></div></footer>
  </main>`;
}
