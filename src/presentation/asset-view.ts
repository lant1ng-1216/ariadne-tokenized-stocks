import type { AssetComparison, AgentTokenizedAsset } from "../domain/agent-types.js";

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

export function renderAssetCard(asset: AgentTokenizedAsset): string {
  const market = asset.market;
  const issuerLogo = asset.issuer.logoUrl ? `![${asset.issuer.name} logo](${asset.issuer.logoUrl})` : "Issuer logo: not available";
  const underlyingLogo = asset.metadata.underlyingLogoUrl ? `![${asset.underlyingTicker} logo](${asset.metadata.underlyingLogoUrl})` : "Underlying logo: not available";
  const links = asset.links.length ? asset.links.map((link) => `[${link.label}](${link.url})`).join(" · ") : "No verified links";
  const warnings = asset.dataQuality.warnings.length ? asset.dataQuality.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  return [
    `### ${asset.underlyingName || asset.underlyingTicker} · ${asset.issuer.name}`,
    `${underlyingLogo}  ${issuerLogo}`,
    "",
    "> Evidence card — not an investment recommendation",
    "",
    "**Identity**",
    `- Token: **${value(asset.tokenSymbol)}** · Platform: **${value(asset.platformId)}** · Chain: **${value(asset.chainId)}**`,
    `- Contract: \`${compactAddress(asset.contractAddress)}\``,
    "",
    "**Market snapshot**",
    `- Token price: **${value(market?.tokenPrice)}** · Reference price: **${value(market?.referencePrice)}**`,
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
  const rows = comparison.rows.map((row) => {
    const market = row.asset.market;
    const status = row.excludedReasons.length ? `Excluded: ${row.excludedReasons.join("; ")}` : `Eligible · rank ${row.rank ?? "—"}`;
    return `| ${row.rank ?? "—"} | ${row.asset.issuer.name} | ${row.asset.tokenSymbol || "—"} | ${market?.tokenPrice || "—"} | ${market?.referencePrice || "—"} | ${market?.priceGapPercent || "—"} | ${statusLabel(row.asset)} | ${completenessLabel(row.asset)} |`;
  });
  const contracts = comparison.rows.map((row) => `- ${row.asset.issuer.name} / ${row.asset.tokenSymbol || "—"}: \`${compactAddress(row.asset.contractAddress)}\``);
  return [
    `### ${comparison.underlyingName || comparison.underlyingTicker} representations`,
    "",
    comparison.summary,
    "",
    "| Rank | Issuer | Symbol | Observed price | Reference price | Gap | Market status | Data |",
    "|---:|---|---|---:|---:|---:|---|---|",
    ...rows,
    "",
    "Contract references:",
    ...contracts,
    "",
    comparison.warnings.length ? `Warnings:\n${comparison.warnings.map((warning) => `- ${warning}`).join("\n")}` : "Warnings: none",
    "",
    "Interpretation: eligibility and ranking reflect the supplied criteria and observed data only; they are not investment advice.",
    "Next: inspect a chosen representation or request a quote. No transaction was created."
  ].join("\n");
}

export function renderResearchBrief(assets: AgentTokenizedAsset[], comparison: AssetComparison): string {
  const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
  const limited = assets.filter((asset) => asset.dataQuality.completeness !== "complete").length;
  const warnings = new Set([...comparison.warnings, ...assets.flatMap((asset) => asset.dataQuality.warnings)]);
  return [
    `# Ariadne research brief · ${comparison.underlyingName || comparison.underlyingTicker}`,
    "",
    "> Evidence-first view for an existing Agent. This is not investment advice and does not create a transaction.",
    "",
    "## At a glance",
    "",
    `- **${assets.length}** issuer representations found · **${eligible.length}** match the supplied criteria · **${warnings.size}** distinct warnings`,
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
    "Research is read-only. No quote, signature, transaction, wallet mutation or broadcast was performed."
  ].join("\n");
}
