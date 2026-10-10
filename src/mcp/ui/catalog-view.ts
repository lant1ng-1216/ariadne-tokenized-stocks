type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

function formatTime(value: unknown, zh: boolean) {
  if (typeof value !== "number" || !Number.isFinite(value)) return zh ? "上游未提供目录响应时间" : "Catalog response time not supplied";
  return new Date(value).toISOString();
}

export function renderCatalogView(payloadValue: unknown): string {
  const payload = record(payloadValue);
  const zh = text(payload.language) === "zh-CN";
  const scope = record(payload.scope);
  const filtered = record(payload.filtered);
  const filters = record(payload.filters);
  const pagination = record(payload.pagination);
  const sourceTimes = record(payload.sourceTimes);
  const issuers = list(payload.issuers).map(record);
  const assetTypes = list(payload.assetTypes).map(record);
  const items = list(payload.items).map(record);
  const warnings = list(payload.warnings).filter((value): value is string => typeof value === "string");
  const activeFilters = [
    ...list(filters.issuerIds).map((issuer) => `${zh ? "发行方" : "Issuer"}: ${text(issuer)}`),
    ...list(filters.assetTypes).map((type) => `${zh ? "类型" : "Type"}: ${String(type)}`),
    ...(filters.multiIssuerOnly === true ? [zh ? "仅看双发行方" : "Dual-issuer only"] : []),
  ];
  const rows = items.length ? items.map((item) => {
    const itemIssuers = list(item.issuers).map(record);
    const issuerBadges = itemIssuers.map((issuer) => `<span class="issuer-badge">${escapeHtml(text(issuer.name, text(issuer.platformId)))}</span>`).join("");
    const symbols = itemIssuers.flatMap((issuer) => list(issuer.tokenSymbols).map((symbol) => text(symbol))).filter(Boolean).join(" · ");
    const displayName = zh ? text(item.underlyingNameZh, text(item.underlyingName)) : text(item.underlyingName);
    return `<article class="catalog-row">
      <div class="ticker"><strong>${escapeHtml(text(item.underlyingTicker))}</strong><span>${escapeHtml(displayName)}</span></div>
      <div class="issuer-list">${issuerBadges}</div>
      <div class="symbols">${escapeHtml(symbols)}</div>
      <div class="representation-count">${escapeHtml(number(item.representationCount))} ${zh ? "个版本" : "representation(s)"}</div>
    </article>`;
  }).join("") : `<div class="empty-result">${zh ? "当前筛选没有返回标的。可以放宽发行方、资产类型或双发行方条件。" : "No underlying matched these filters. Relax issuer, asset-type or dual-issuer constraints."}</div>`;
  const issuerSummary = issuers.map((issuer) => `<div class="distribution-item"><span>${escapeHtml(text(issuer.name, text(issuer.platformId)))}</span><strong>${escapeHtml(number(issuer.underlyingCount))}</strong><small>${zh ? "个标的" : "underlyings"}</small></div>`).join("");
  const typeSummary = assetTypes.map((type) => `<span class="type-chip">${escapeHtml(text(type.label))} · ${escapeHtml(number(type.underlyingCount))}</span>`).join("");
  const caveats = warnings.length ? `<details class="catalog-caveats"><summary>${warnings.length}${zh ? " 条目录范围说明" : " catalog scope note(s)"}</summary><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></details>` : "";
  return `<main class="catalog-shell">
    <header class="catalog-heading">
      <div class="brandline"><span class="brand-thread" aria-hidden="true"></span><span class="brand-name">Ariadne</span><span class="brand-divider">·</span><span class="brand-context">${zh ? "漫游 · Binance Web3 · BSC" : "Explore · Binance Web3 · BSC"}</span></div>
      <span class="read-only">${zh ? "只读目录" : "Read-only catalog"}</span>
    </header>
    <section class="catalog-hero"><p>${escapeHtml(text(scope.wording))}</p><h1>${zh ? "从市场全景开始" : "Start with the market landscape"}</h1><div class="metrics"><div><strong>${escapeHtml(number(scope.uniqueUnderlyingCount))}</strong><span>${zh ? "个标的" : "underlyings"}</span></div><div><strong>${escapeHtml(number(scope.representationCount))}</strong><span>${zh ? "个链上版本" : "representations"}</span></div><div><strong>${escapeHtml(number(scope.issuerCount))}</strong><span>${zh ? "家发行方" : "issuers"}</span></div></div></section>
    <section class="explore-strip"><div class="distribution">${issuerSummary}</div><div class="type-list">${typeSummary}</div></section>
    ${activeFilters.length ? `<div class="active-filters">${activeFilters.map((filter) => `<span>${escapeHtml(filter)}</span>`).join("")}</div>` : ""}
    <section class="catalog-results"><header><div><h2>${zh ? "可继续了解的标的" : "Underlyings to explore"}</h2><p>${zh ? `当前条件返回 ${number(filtered.uniqueUnderlyingCount)} 个标的` : `${number(filtered.uniqueUnderlyingCount)} underlyings match the current filters`}</p></div><span>${number(pagination.offset) + (items.length ? 1 : 0)}–${number(pagination.offset) + items.length} / ${number(pagination.total)}</span></header>${rows}</section>
    ${caveats}
    <footer><span>${zh ? "选择一个标的后，再进入发行方研究与行情比较" : "Choose one underlying next, then open issuer research and market comparison"}</span><span>${escapeHtml(formatTime(sourceTimes.catalogResponseTimestampMs, zh))}</span></footer>
  </main>`;
}
