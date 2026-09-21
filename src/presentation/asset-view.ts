import type { AssetComparison, AgentTokenizedAsset } from "../domain/agent-types.js";

const value = (input: string | number | boolean | undefined, fallback = "Not available") => input === undefined || input === "" ? fallback : String(input);

export function renderAssetCard(asset: AgentTokenizedAsset): string {
  const market = asset.market;
  const issuerLogo = asset.issuer.logoUrl ? `![${asset.issuer.name} logo](${asset.issuer.logoUrl})` : "Issuer logo: not available";
  const underlyingLogo = asset.metadata.underlyingLogoUrl ? `![${asset.underlyingTicker} logo](${asset.metadata.underlyingLogoUrl})` : "Underlying logo: not available";
  const links = asset.links.length ? asset.links.map((link) => `[${link.label}](${link.url})`).join(" · ") : "No verified links";
  const warnings = asset.dataQuality.warnings.length ? asset.dataQuality.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  return [
    `### ${asset.underlyingName || asset.underlyingTicker} — ${asset.issuer.name}`,
    `${underlyingLogo}  ${issuerLogo}`,
    "",
    `- Symbol: **${value(asset.tokenSymbol)}**`,
    `- Platform: **${value(asset.platformId)}**`,
    `- Chain: **${value(asset.chainId)}**`,
    `- Contract: \`${value(asset.contractAddress)}\``,
    `- Token price: **${value(market?.tokenPrice)}**`,
    `- Reference price: **${value(market?.referencePrice)}**`,
    `- Price gap: **${value(market?.priceGap)}** (${value(market?.priceGapPercent)})`,
    `- Market status: **${value(market?.marketStatus)}**; open state: **${value(market?.openState)}**`,
    `- Data completeness: **${asset.dataQuality.completeness}**`,
    `- Links: ${links}`,
    "",
    "Warnings:",
    warnings,
    "",
    `Next: compare this representation, request a quote, or simulate an action. Side effects: **none**.`
  ].join("\n");
}

export function renderComparisonTable(comparison: AssetComparison): string {
  const rows = comparison.rows.map((row) => {
    const market = row.asset.market;
    const status = row.excludedReasons.length ? `Excluded: ${row.excludedReasons.join("; ")}` : `Rank ${row.rank ?? "—"}`;
    return `| ${row.asset.issuer.name} | ${row.asset.tokenSymbol || "—"} | ${market?.tokenPrice || "—"} | ${market?.referencePrice || "—"} | ${market?.priceGapPercent || "—"} | ${market?.marketStatus || "unknown"} | ${status} |`;
  });
  return [
    `### ${comparison.underlyingName || comparison.underlyingTicker} representations`,
    "",
    comparison.summary,
    "",
    "| Issuer | Symbol | Token price | Reference price | Gap | Market status | Eligibility |",
    "|---|---|---:|---:|---:|---|---|",
    ...rows,
    "",
    comparison.warnings.length ? `Warnings:\n${comparison.warnings.map((warning) => `- ${warning}`).join("\n")}` : "Warnings: none",
    "",
    "Next: choose a representation or request an execution-readiness analysis. No transaction was created."
  ].join("\n");
}
