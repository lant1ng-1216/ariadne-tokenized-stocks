const workspace = document.querySelector("#workspace");
const form = document.querySelector("#research-form");
const queryInput = document.querySelector("#query");
const exposureWorkspace = document.querySelector("#exposure-workspace");
const exposureForm = document.querySelector("#exposure-form");
const walletInput = document.querySelector("#wallet-address");
const quoteWorkspace = document.querySelector("#quote-workspace");
const quoteForm = document.querySelector("#quote-form");
const quoteWalletInput = document.querySelector("#quote-wallet");
const quotePlatformInput = document.querySelector("#quote-platform");
const quoteAmountInput = document.querySelector("#quote-amount");
let comparisonSort = "default";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[character]));
const compactAddress = (value) => value && value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value || "Not available";
const price = (value) => value ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 }) : "Not available";
const gapNumber = (representation) => Number.parseFloat(String(representation.market.priceGapPercent || representation.market.priceGap || "").replace("%", "")) || Number.POSITIVE_INFINITY;
const marketStatus = (representation) => {
  if (representation.market.marketStatus === "open") return ["Open", "open"];
  if (representation.market.marketStatus === "closed") return ["Closed", ""];
  if (representation.market.marketStatus === "offhours") return ["Off-hours", ""];
  return [representation.market.openState ? "Open state · status unknown" : "Status unknown", ""];
};
const initial = (value, fallback) => value ? value.slice(0, 1).toUpperCase() : fallback;
const logoMarkup = (logo, fallback, label) => logo.url
  ? `<img class="logo-image" src="${escapeHtml(logo.url)}" alt="${escapeHtml(label)} logo" />`
  : `<span class="logo-fallback" aria-label="${escapeHtml(label)} logo unavailable">${escapeHtml(fallback)}</span>`;

function renderRepresentation(representation) {
  const [status, statusClass] = marketStatus(representation);
  const gap = representation.market.priceGapPercent || representation.market.priceGap || "Not available";
  const warningCount = representation.evidence.warnings.length;
  return `<article class="asset-card">
    <div class="card-top">
      <div class="identity">
        <div class="logo-stack" aria-label="Logo metadata status">
          <span class="logo">${logoMarkup(representation.underlying.logo, initial(representation.underlying.ticker, "A"), representation.underlying.name)}</span>
          <span class="logo issuer">${logoMarkup(representation.issuer.logo, initial(representation.issuer.name, "I"), representation.issuer.name)}</span>
        </div>
        <div><h3>${escapeHtml(representation.issuer.name)}</h3><p>${escapeHtml(representation.identity.tokenSymbol)} · ${escapeHtml(representation.underlying.name)}</p></div>
      </div>
      <span class="status ${statusClass}">${escapeHtml(status)}</span>
    </div>
    <div class="card-divider"></div>
    <div class="metrics">
      <div class="metric"><label>Token price</label><strong>${escapeHtml(price(representation.market.tokenPrice))}</strong></div>
      <div class="metric"><label>Reference price</label><strong>${escapeHtml(price(representation.market.referencePrice))}</strong></div>
      <div class="metric"><label>Price gap</label><strong class="accent">${escapeHtml(gap)}</strong></div>
    </div>
    <div class="contract"><span>Contract</span><code title="${escapeHtml(representation.identity.contractAddress)}">${escapeHtml(compactAddress(representation.identity.contractAddress))}</code></div>
    <div class="card-bottom"><span class="coverage"><b>${escapeHtml(representation.evidence.completeness)}</b> evidence · ${warningCount} warning${warningCount === 1 ? "" : "s"}</span><button class="inspect" type="button" data-inspect-id="${escapeHtml(representation.id)}">Inspect evidence</button></div>
  </article>`;
}

function renderDetail(representation) {
  const metadata = representation.metadataEvidence.map((item) => `<li><span class="evidence-dot ${item.status}"></span><div><b>${escapeHtml(item.field)}</b><small>${escapeHtml(item.status)} · source: ${escapeHtml(item.source)}</small><p>${escapeHtml(item.explanation)}</p></div></li>`).join("");
  const warnings = representation.evidence.warnings.length
    ? representation.evidence.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")
    : "<li>No warnings reported.</li>";
  const links = representation.evidence.links.length
    ? representation.evidence.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)} ↗</a>`).join("")
    : '<span class="muted">No verified links supplied.</span>';
  return `<aside class="detail-drawer" role="dialog" aria-modal="true" aria-label="Evidence details for ${escapeHtml(representation.issuer.name)}">
    <div class="drawer-head"><div><span class="eyebrow-small">Representation evidence</span><h3>${escapeHtml(representation.issuer.name)} · ${escapeHtml(representation.identity.tokenSymbol)}</h3></div><button class="close-detail" type="button" data-close-detail aria-label="Close evidence details">×</button></div>
    <p class="drawer-summary">This panel shows what Ariadne knows, what it does not know and where the data came from. It does not create a transaction.</p>
    <div class="drawer-section"><h4>Identity</h4><dl><div><dt>Underlying</dt><dd>${escapeHtml(representation.underlying.name)} (${escapeHtml(representation.underlying.ticker)})</dd></div><div><dt>Chain</dt><dd>${escapeHtml(representation.identity.chainId)}</dd></div><div><dt>Contract</dt><dd><code>${escapeHtml(representation.identity.contractAddress)}</code></dd></div></dl></div>
    <div class="drawer-section"><h4>Metadata provenance</h4><ul class="metadata-list">${metadata}</ul></div>
    <div class="drawer-section"><h4>Warnings</h4><ul class="drawer-warnings">${warnings}</ul></div>
    <div class="drawer-section"><h4>References</h4><div class="link-list">${links}</div></div>
    <div class="drawer-boundary">Read-only research · no quote · no signature · no broadcast</div>
  </aside>`;
}

function sortedRepresentations(view) {
  const representations = [...view.representations];
  if (comparisonSort === "gap") return representations.sort((a, b) => gapNumber(a) - gapNumber(b));
  if (comparisonSort === "issuer") return representations.sort((a, b) => a.issuer.name.localeCompare(b.issuer.name));
  return representations;
}

function bindWorkspaceInteractions(view) {
  workspace.querySelectorAll("[data-inspect-id]").forEach((button) => button.addEventListener("click", () => {
    const representation = view.representations.find((item) => item.id === button.dataset.inspectId);
    if (!representation) return;
    const existing = workspace.querySelector(".detail-drawer");
    if (existing) existing.remove();
    workspace.insertAdjacentHTML("beforeend", renderDetail(representation));
    workspace.querySelector("[data-close-detail]").addEventListener("click", () => workspace.querySelector(".detail-drawer")?.remove());
  }));
  workspace.querySelector("#comparison-sort")?.addEventListener("change", (event) => {
    comparisonSort = event.target.value;
    renderWorkspace(view);
  });
}

function renderWorkspace(view) {
  if (view.state === "empty") {
    workspace.innerHTML = `<div class="workspace-head"><div><h2>No supported representation found</h2><p>Search: ${escapeHtml(view.query.ticker)} · BNB Chain · chain ${escapeHtml(view.query.chainId || "56")}</p></div><span class="state-tag neutral">No match</span></div><div class="empty-state"><div class="empty-icon">⌕</div><h3>We could not identify a tokenized-stock representation for this query.</h3><p>Ariadne does not guess from ticker symbols. Try another company or use the asset directory when it is available.</p><button class="inspect" type="button" data-query="NVDA">Try NVDA Demo</button></div>`;
    workspace.querySelector("[data-query]").addEventListener("click", () => { queryInput.value = "NVDA"; void loadResearch("NVDA"); });
    return;
  }
  const warnings = [...new Set(view.comparison.warnings)];
  const representations = sortedRepresentations(view);
  workspace.innerHTML = `<div class="workspace-head"><div><h2>${escapeHtml(view.query.name)} <span class="muted">(${escapeHtml(view.query.ticker)})</span></h2><p>Issuer-aware representations on BNB Chain · chain ${escapeHtml(view.query.chainId)}</p></div><span class="state-tag">${view.state === "partial" ? "Partial evidence · review gaps" : "Evidence ready"}</span></div>
    <div class="stats"><div class="stat"><label>Representations found</label><strong class="blue">${view.summary.representationsFound}</strong></div><div class="stat"><label>Eligible by criteria</label><strong>${view.summary.eligibleRepresentations}</strong></div><div class="stat"><label>Data warnings</label><strong>${view.summary.warningCount}</strong></div><div class="stat"><label>Market contexts</label><strong>${view.representations.filter((item) => item.evidence.coverage.marketContext === "fetched").length}/${view.summary.representationsFound}</strong></div></div>
    <div class="compare-toolbar"><div><b>Compare representations</b><span>Mechanical ordering only · not an investment recommendation</span></div><label>Sort<select id="comparison-sort"><option value="default" ${comparisonSort === "default" ? "selected" : ""}>Evidence order</option><option value="gap" ${comparisonSort === "gap" ? "selected" : ""}>Smallest price gap</option><option value="issuer" ${comparisonSort === "issuer" ? "selected" : ""}>Issuer name</option></select></label></div>
    <div id="compare" class="cards">${representations.map(renderRepresentation).join("")}</div>
    <div class="below-grid"><section class="panel"><h3>Evidence gaps</h3><p class="panel-intro">Ariadne surfaces missing information instead of filling it with assumptions.</p><ul class="warning-list">${warnings.length ? warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("") : "<li>No warnings reported</li>"}</ul>${view.timing ? `<div class="timing"><strong>${view.timing.totalMs} ms</strong><span>Ariadne path only · Agent reasoning excluded</span></div>` : ""}</section><section class="panel"><h3>Next safe steps</h3><p class="panel-intro">Research remains separate from preparation and execution.</p><ol class="next-list">${view.nextSteps.map((step) => `<li><div><b>${escapeHtml(step.title)}</b>${escapeHtml(step.description)}</div></li>`).join("")}</ol></section></div>`;
  bindWorkspaceInteractions(view);
}

function renderExposure(view) {
  if (view.state === "empty") {
    exposureWorkspace.innerHTML = `<div class="exposure-empty"><b>No holdings returned.</b><span>The address was read successfully, but no wallet holdings were returned for this chain.</span></div>`;
    return;
  }
  const stateLabel = view.state === "ready" ? "Matched exposure" : view.state === "unmatched" ? "Needs identity review" : "Partial identity coverage";
  const rows = view.holdings.map((holding) => `<article class="holding-row"><div class="holding-main"><span class="holding-dot ${holding.status}"></span><div><b>${escapeHtml(holding.asset?.ticker || holding.symbol || "Unknown token")}</b><span>${holding.asset ? `${escapeHtml(holding.asset.issuer)} · ${escapeHtml(holding.asset.tokenSymbol)}` : "Not matched to Ariadne's current RWA directory"}</span></div></div><div class="holding-values"><b>${escapeHtml(holding.balance)}</b><span>${holding.estimatedValue ? `≈ ${escapeHtml(holding.estimatedValue)} (token price)` : "Value unavailable"}</span></div></article>`).join("");
  exposureWorkspace.innerHTML = `<div class="exposure-head"><div><h3>Wallet exposure</h3><p>${escapeHtml(view.walletAddress)} · BNB Chain · chain ${escapeHtml(view.chainId)}</p></div><span class="state-tag ${view.state === "ready" ? "ready" : ""}">${escapeHtml(stateLabel)}</span></div><div class="exposure-stats"><div><label>Holdings read</label><strong>${view.summary.holdingsFound}</strong></div><div><label>Matched RWA</label><strong class="blue">${view.summary.matchedTokenizedStocks}</strong></div><div><label>Unmatched</label><strong>${view.summary.unmatchedHoldings}</strong></div><div><label>Priced holdings</label><strong>${view.summary.pricedHoldings}</strong></div></div><div class="holding-list">${rows}</div><div class="exposure-foot"><span>${view.warnings.length ? `${view.warnings.length} data warning${view.warnings.length === 1 ? "" : "s"} surfaced` : "No data warnings"}</span><b>Read-only · no private key · no signature · no broadcast</b></div>`;
}

async function loadExposure(address = walletInput.value.trim()) {
  if (!address) {
    exposureWorkspace.innerHTML = '<div class="exposure-empty"><b>Enter a public address.</b><span>Ariadne needs a public BSC address to read wallet context. Never enter a private key or seed phrase.</span></div>';
    return;
  }
  exposureWorkspace.innerHTML = '<div class="loading-state">Reading public wallet exposure…</div>';
  try {
    const response = await fetch(`/api/exposure?walletAddress=${encodeURIComponent(address)}&query=${encodeURIComponent(queryInput.value.trim() || "NVDA")}&chainId=56`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `Exposure request failed (${response.status})`);
    renderExposure(payload.view);
  } catch (error) {
    exposureWorkspace.innerHTML = `<div class="error-state">${escapeHtml(error.message)}.</div>`;
  }
}

function renderQuote(view) {
  const quote = view.quote;
  const warnings = view.warnings.length ? view.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("") : "<li>No quote warnings reported.</li>";
  quoteWorkspace.innerHTML = `<div class="quote-result-head"><div><h3>${escapeHtml(view.asset.issuer)} · ${escapeHtml(view.asset.tokenSymbol)}</h3><p>${escapeHtml(view.request.amount)} USDT · ${escapeHtml(view.request.walletAddress)}</p></div><span class="state-tag ${quote.success ? "ready" : "neutral"}">${quote.success ? "Quote returned" : "Quote unavailable"}</span></div><div class="quote-metrics"><div><label>Expected output</label><strong>${escapeHtml(quote.expectedOutput || "Not available")}</strong></div><div><label>Price impact</label><strong>${escapeHtml(quote.priceImpact || "Not available")}</strong></div><div><label>Venue</label><strong>${escapeHtml(quote.venue || "Not available")}</strong></div><div><label>Minimum output</label><strong>${quote.minimumOutputAvailable ? "Supplied" : "Not supplied"}</strong></div></div><div class="quote-notes"><div><b>Warnings</b><ul>${warnings}</ul></div><div class="quote-boundary">Read-only quote · no ActionPlan · no approval transaction · no signature · no broadcast</div></div>`;
}

async function loadQuote() {
  const address = quoteWalletInput.value.trim();
  const amount = quoteAmountInput.value.trim();
  const platformId = quotePlatformInput.value;
  if (!address) {
    quoteWorkspace.innerHTML = '<div class="exposure-empty"><b>Enter a public address.</b><span>The quote source may use it for route context. Ariadne never asks for a private key.</span></div>';
    return;
  }
  quoteWorkspace.innerHTML = '<div class="loading-state">Requesting a read-only quote…</div>';
  try {
    const query = queryInput.value.trim() || "NVDA";
    const response = await fetch(`/api/quote?walletAddress=${encodeURIComponent(address)}&query=${encodeURIComponent(query)}&platformId=${encodeURIComponent(platformId)}&amount=${encodeURIComponent(amount)}&chainId=56`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `Quote request failed (${response.status})`);
    renderQuote(payload.view);
  } catch (error) {
    quoteWorkspace.innerHTML = `<div class="error-state">${escapeHtml(error.message)}.</div>`;
  }
}

function render(view) {
  comparisonSort = "default";
  renderWorkspace(view);
}

async function loadResearch(query = queryInput.value.trim() || "NVDA") {
  workspace.innerHTML = '<div class="loading-state">Refreshing issuer-aware evidence…</div>';
  try {
    const response = await fetch(`/api/research?query=${encodeURIComponent(query)}&chainId=56`);
    if (!response.ok) throw new Error(`Research request failed (${response.status})`);
    const payload = await response.json();
    render(payload.view);
  } catch (error) {
    workspace.innerHTML = `<div class="error-state">${escapeHtml(error.message)}. Start the local Ariadne web Demo Mode and try again.</div>`;
  }
}

form.addEventListener("submit", (event) => { event.preventDefault(); void loadResearch(); });
document.querySelectorAll("[data-query]").forEach((button) => button.addEventListener("click", () => { queryInput.value = button.dataset.query; void loadResearch(button.dataset.query); }));
exposureForm.addEventListener("submit", (event) => { event.preventDefault(); void loadExposure(); });
quoteForm.addEventListener("submit", (event) => { event.preventDefault(); void loadQuote(); });
document.querySelectorAll("[data-wallet]").forEach((button) => button.addEventListener("click", () => { walletInput.value = button.dataset.wallet; quoteWalletInput.value = button.dataset.wallet; void loadExposure(button.dataset.wallet); }));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") workspace.querySelector(".detail-drawer")?.remove(); });
void loadResearch();
