import type { AssetComparison, AgentTokenizedAsset, ResearchNextStep, ResearchTiming } from "../domain/agent-types.js";

const value = (input: string | number | boolean | undefined, fallback = "Not available") => input === undefined || input === "" ? fallback : String(input);
const compactAddress = (input: string | undefined) => input && input.length > 14 ? `${input.slice(0, 8)}…${input.slice(-6)}` : value(input);
const statusLabel = (asset: AgentTokenizedAsset) => {
  if (asset.market?.marketStatus === "closed") return "Closed";
  if (asset.market?.marketStatus === "offhours") return "Off-hours";
  if (asset.market?.marketStatus === "open") return "Open";
  if (asset.market?.openState === true) return "Open state reported; status unknown";
  return "Unknown";
};
const completenessLabel = (asset: AgentTokenizedAsset) => asset.dataQuality.completeness === "complete" ? "Complete" : asset.dataQuality.completeness === "partial" ? "Partial" : "Limited";
const updatedLabel = (timestamp: number | undefined) => timestamp ? new Date(timestamp).toISOString() : "Not available";
const coverageLabel = (asset: AgentTokenizedAsset) => `${asset.dataQuality.coverage.identity} identity · ${asset.dataQuality.coverage.marketContext.replaceAll("_", " ")} market context`;
const unique = (values: string[]) => [...new Set(values)];

export function researchNextSteps(assets: AgentTokenizedAsset[], comparison: AssetComparison): ResearchNextStep[] {
  const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
  const hasGaps = assets.some((asset) => asset.dataQuality.coverage.marketContext !== "fetched" || asset.dataQuality.warnings.length > 0);
  const steps: ResearchNextStep[] = [];
  if (eligible.length) {
    steps.push({
      id: "inspect_representation",
      title: "Inspect one representation",
      description: "Choose an issuer and review its contract, market snapshot and data warnings.",
      sideEffects: "none",
      requiresExplicitSelection: true
    });
  }
  if (hasGaps) {
    steps.push({
      id: "review_data_gaps",
      title: "Review data gaps",
      description: "Resolve unknown market status, missing liquidity or unavailable metadata before relying on a comparison.",
      sideEffects: "none"
    });
  }
  if (eligible.length && assets.some((asset) => asset.dataQuality.coverage.marketContext === "fetched")) {
    steps.push({
      id: "request_read_only_quote",
      title: "Request a read-only quote",
      description: "Ask for a fresh quote for the explicitly selected representation; no plan, signature or broadcast is created by this step.",
      sideEffects: "none",
      requiresExplicitSelection: true
    });
  }
  steps.push({
    id: "read_wallet_exposure",
    title: "Read wallet exposure",
    description: "Provide a public BSC address to inspect holdings without sending a transaction or sharing a private key.",
    sideEffects: "none"
  });
  return steps.slice(0, 4);
}

export function renderAssetCard(asset: AgentTokenizedAsset): string {
  const market = asset.market;
  const issuerLogo = asset.issuer.logoUrl ? asset.issuer.logoUrl : "not available from verified metadata";
  const underlyingLogo = asset.metadata.underlyingLogoUrl ? asset.metadata.underlyingLogoUrl : "not available from verified metadata";
  const links = asset.links.length ? asset.links.map((link) => `[${link.label}](${link.url})`).join(" · ") : "No verified links";
  const warnings = asset.dataQuality.warnings.length ? asset.dataQuality.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  return [
    `### ${asset.underlyingName || asset.underlyingTicker} · ${asset.issuer.name}`,
    `Visual metadata: underlying logo **${underlyingLogo}** · issuer logo **${issuerLogo}**`,
    "",
    "> Evidence card — not an investment recommendation",
    "",
    "**Identity**",
    `- Token: **${value(asset.tokenSymbol)}** · Platform: **${value(asset.platformId)}** · Chain: **${value(asset.chainId)}**`,
    `- Contract: \`${compactAddress(asset.contractAddress)}\``,
    `- Coverage: **${coverageLabel(asset)}**`,
    "",
    "**Market snapshot**",
    `- Observed price: **${value(market?.tokenPrice)}** · Reference price: **${value(market?.referencePrice)}**`,
    `- Price gap: **${value(market?.priceGapPercent, value(market?.priceGap))}** · Status: **${statusLabel(asset)}**`,
    `- Last update: **${updatedLabel(market?.tokenPriceUpdatedAt)}**`,
    "",
    "**Data quality**",
    `- Completeness: **${completenessLabel(asset)}** · Missing fields: **${asset.dataQuality.missingFields.length ? asset.dataQuality.missingFields.join(", ") : "None reported"}**`,
    `- Links: ${links}`,
    "",
    "Warnings:",
    warnings,
    "",
    `Next safe step: compare this representation or request a quote after an explicit selection. Side effects: **none**.`
  ].join("\n");
}

export function renderComparisonTable(comparison: AssetComparison): string {
  const rows = comparison.rows.map((row, index) => {
    const market = row.asset.market;
    const status = row.excludedReasons.length ? `Excluded: ${row.excludedReasons.join("; ")}` : `Eligible · rank ${row.rank ?? "—"}`;
    return [
      `#### Representation ${index + 1} · ${row.asset.issuer.name}`,
      `- Rank: **${row.rank ?? "—"}** · Eligibility: **${status}**`,
      `- Token: **${value(row.asset.tokenSymbol)}** · Contract: \`${row.asset.contractAddress}\``,
      `- Observed price: **${value(market?.tokenPrice)}** · Reference price: **${value(market?.referencePrice)}**`,
      `- Price gap: **${value(market?.priceGapPercent, value(market?.priceGap))}** · Market status: **${statusLabel(row.asset)}**`,
      `- Evidence coverage: **${coverageLabel(row.asset)}** · Completeness: **${completenessLabel(row.asset)}**`,
      row.asset.dataQuality.warnings.length ? `- Data warnings: ${unique(row.asset.dataQuality.warnings).join("; ")}` : "- Data warnings: none"
    ].join("\n");
  });
  return [
    `### ${comparison.underlyingName || comparison.underlyingTicker} representations`,
    "",
    comparison.summary,
    "",
    ...rows,
    "",
    comparison.warnings.length ? `Warnings:\n${comparison.warnings.map((warning) => `- ${warning}`).join("\n")}` : "Warnings: none",
    "",
    "Interpretation: eligibility and ranking reflect the supplied criteria and observed data only; they are not investment advice.",
    "Next: inspect a chosen representation or request a quote. No transaction was created."
  ].join("\n");
}

export function renderResearchBrief(
  assets: AgentTokenizedAsset[],
  comparison: AssetComparison,
  timing?: ResearchTiming,
  nextSteps = researchNextSteps(assets, comparison)
): string {
  const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
  const limited = assets.filter((asset) => asset.dataQuality.completeness !== "complete").length;
  const warnings = new Set([...comparison.warnings, ...assets.flatMap((asset) => asset.dataQuality.warnings)]);
  const fetchedMarketContexts = assets.filter((asset) => asset.dataQuality.coverage.marketContext === "fetched").length;
  const actions = nextSteps.map((step, index) => [
    `${index + 1}. **${step.title}** — ${step.description}`,
    `   Side effects: **${step.sideEffects}**${step.requiresExplicitSelection ? " · explicit representation selection required" : ""}`
  ].join("\n"));
  return [
    `# Ariadne research brief · ${comparison.underlyingName || comparison.underlyingTicker}`,
    "",
    "> Evidence-first view for an existing Agent. This is not investment advice and does not create a transaction.",
    "",
    "## At a glance",
    "",
    `- **${assets.length}** issuer representations found · **${eligible.length}** match the supplied criteria · **${warnings.size}** distinct warnings`,
    `- Identity coverage: **${assets.filter((asset) => asset.dataQuality.coverage.identity === "confirmed").length}/${assets.length} confirmed** · market context: **${fetchedMarketContexts}/${assets.length} fetched**`,
    `- **${limited}** representation(s) have incomplete data; missing data is not treated as zero or as a positive signal`,
    `- Preferred next step: **${eligible.length ? "review a specific representation before requesting a quote" : "inspect exclusions or relax the criteria"}**`,
    "",
    "## Cross-issuer comparison",
    "",
    renderComparisonTable(comparison),
    "",
    "## Representation details",
    "",
    assets.map(renderAssetCard).join("\n\n---\n\n"),
    "",
    "## Execution boundary",
    "",
    "Research is read-only. No quote, signature, transaction, wallet mutation or broadcast was performed.",
    "",
    "## What Ariadne can do next",
    "",
    ...actions,
    ...(timing ? [
      "",
      "## Product timing",
      "",
      `- Ariadne workflow: **${timing.totalMs} ms** (search ${timing.searchMs} ms · market context ${timing.marketContextMs} ms · comparison ${timing.comparisonMs} ms · presentation ${timing.presentationMs} ms).`,
      "- This measurement covers the MCP handler and SDK/API path only; Agent reasoning and final answer rendering are excluded."
    ] : [])
  ].join("\n");
}
