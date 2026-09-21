import type { AssetComparison, AgentTokenizedAsset } from "../domain/agent-types.js";

const value = (input: string | number | boolean | undefined, fallback = "Not available") => input === undefined || input === "" ? fallback : String(input);
const compactAddress = (input: string | undefined) => input && input.length > 14 ? `${input.slice(0, 8)}…${input.slice(-6)}` : value(input);

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
    `- Contract: \`${compactAddress(asset.contractAddress)}\``,
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
    const status = row.excludedReasons.length ? `Excluded: ${row.excludedReasons.join("; ")}` : `Eligible · rank ${row.rank ?? "—"}`;
    return `| ${row.asset.issuer.name} | ${row.asset.tokenSymbol || "—"} | ${market?.tokenPrice || "—"} | ${market?.referencePrice || "—"} | ${market?.priceGapPercent || "—"} | ${market?.marketStatus || "unknown"} | ${status} |`;
  });
  const contracts = comparison.rows.map((row) => `- ${row.asset.issuer.name} / ${row.asset.tokenSymbol || "—"}: \`${compactAddress(row.asset.contractAddress)}\``);
  return [
    `### ${comparison.underlyingName || comparison.underlyingTicker} representations`,
    "",
    comparison.summary,
    "",
    "| Issuer | Symbol | Observed price | Reference price | Gap | Market status | Eligibility |",
    "|---|---|---:|---:|---:|---|---|",
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
