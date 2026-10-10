import type { AssetComparison, AgentTokenizedAsset, ResearchNextStep, ResearchTiming } from "../domain/agent-types.js";
import { hasMarketStateConflict, normalizeProviderTimestamp } from "../domain/normalizers.js";
import { localizeEvidenceMessage, type OutputLanguage } from "./language.js";

const value = (input: string | number | boolean | undefined, fallback = "Not available") => input === undefined || input === "" ? fallback : String(input);
const compactAddress = (input: string | undefined) => input && input.length > 14 ? `${input.slice(0, 8)}…${input.slice(-6)}` : value(input);
const statusLabel = (asset: AgentTokenizedAsset, language: OutputLanguage) => {
  if (asset.market && hasMarketStateConflict(asset.market.marketStatus, asset.market.openState)) return language === "zh-CN" ? "非开放" : "Not open";
  if (asset.market?.marketStatus === "closed") return language === "zh-CN" ? "已休市" : "Closed";
  if (asset.market?.marketStatus === "offhours") return language === "zh-CN" ? "非正常交易时段" : "Off-hours";
  if (asset.market?.marketStatus === "open") return language === "zh-CN" ? "开放" : "Open";
  if (asset.market?.openState === true) return language === "zh-CN" ? "未知" : "Unknown";
  return language === "zh-CN" ? "未知" : "Unknown";
};
const assetTypeLabel = (assetType: number | undefined, language: OutputLanguage) => {
  if (assetType === undefined || !Number.isSafeInteger(assetType)) return undefined;
  const label = assetType === 1 ? (language === "zh-CN" ? "股票" : "Stock")
    : assetType === 2 ? "Pre-IPO"
      : assetType === 3 ? "ETF"
        : language === "zh-CN" ? "未知类型" : "Unknown type";
  return label + " (" + assetType + ")";
};
const sourceTimestampLabel = (timestamp: number, language: OutputLanguage) => {
  const normalized = normalizeProviderTimestamp(timestamp);
  if (normalized === undefined) return language === "zh-CN" ? "未提供有效来源时间戳" : "No valid source timestamp supplied";
  return new Date(normalized).toISOString();
};
const untrustedMarkdownValue = (input: string | number) => String(input)
  .replace(/[\r\n\u2028\u2029]+/g, " ")
  .replace(/[\\`*_{}\[\]()#+.!|<>~]/g, "\\$&");
const sourceStatusDetails = (market: AgentTokenizedAsset["market"], language: OutputLanguage) => {
  if (!market) return undefined;
  const zh = language === "zh-CN";
  const separator = zh ? "：" : ": ";
  const details = [
    ...(market.providerMarketStatus !== undefined ? [(zh ? "上游状态" : "Provider status") + separator + untrustedMarkdownValue(market.providerMarketStatus)] : []),
    ...(typeof market.openState === "boolean" ? [(zh ? "上游开放标记" : "Provider open-state flag") + separator + String(market.openState)] : []),
    ...(market.reasonCode !== undefined ? [(zh ? "原因代码" : "Reason code") + separator + untrustedMarkdownValue(market.reasonCode)] : []),
    ...(market.reasonMsg !== undefined ? [(zh ? "上游说明" : "Provider note") + separator + untrustedMarkdownValue(market.reasonMsg)] : []),
    ...(market.volume24H !== undefined ? [(zh ? "24 小时成交量" : "24h volume") + separator + untrustedMarkdownValue(market.volume24H)] : []),
    ...(market.liquidity !== undefined ? [(zh ? "上游流动性字段" : "Provider liquidity field") + separator + untrustedMarkdownValue(market.liquidity)] : []),
    ...(typeof market.holders === "number" ? [(zh ? "持有者数量字段" : "Provider holder-count field") + separator + String(market.holders)] : []),
    ...(market.nextOpenTime !== undefined ? [(zh ? "下次开放" : "Next open") + separator + sourceTimestampLabel(market.nextOpenTime, language)] : []),
    ...(market.nextCloseTime !== undefined ? [(zh ? "下次收盘" : "Next close") + separator + sourceTimestampLabel(market.nextCloseTime, language)] : [])
  ];
  return details.length ? details.join(" · ") : undefined;
};
const completenessLabel = (asset: AgentTokenizedAsset, language: OutputLanguage) => asset.dataQuality.completeness === "complete" ? language === "zh-CN" ? "完整" : "Complete" : asset.dataQuality.completeness === "partial" ? language === "zh-CN" ? "部分" : "Partial" : language === "zh-CN" ? "有限" : "Limited";
const updatedLabel = (timestamp: number | undefined, language: OutputLanguage) => {
  const normalized = normalizeProviderTimestamp(timestamp);
  return normalized === undefined ? language === "zh-CN" ? "未提供有效来源时间戳" : "No valid source timestamp supplied" : new Date(normalized).toISOString();
};
const provenanceLabel = (market: AgentTokenizedAsset["market"], language: OutputLanguage) => market?.provenance?.length
  ? market.provenance.map((source) => `${source.provider} ${source.endpoint} [fields: ${source.fields.join(", ")}]${source.responseTimestampMs ? ` (response ${updatedLabel(source.responseTimestampMs, language)})` : ""}`).join("; ")
  : language === "zh-CN" ? "未提供" : "Not supplied";
const coverageLabel = (asset: AgentTokenizedAsset, language: OutputLanguage) => language === "zh-CN"
  ? `${asset.dataQuality.coverage.identity === "confirmed" ? "已确认" : "部分"}身份 · 行情信息${asset.dataQuality.coverage.marketContext === "fetched" ? "已获取" : asset.dataQuality.coverage.marketContext === "not_requested" ? "未请求" : "不可用"}`
  : `${asset.dataQuality.coverage.identity} identity · ${asset.dataQuality.coverage.marketContext.replaceAll("_", " ")} market context`;
const unique = (values: string[]) => [...new Set(values)];

export function researchNextSteps(assets: AgentTokenizedAsset[], comparison: AssetComparison, options: { allowWalletExposureFollowUp?: boolean; language?: OutputLanguage } = {}): ResearchNextStep[] {
  const language = options.language ?? "en";
  const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
  const hasGaps = assets.some((asset) => asset.dataQuality.coverage.marketContext !== "fetched" || asset.dataQuality.warnings.length > 0);
  const steps: ResearchNextStep[] = [];
  if (eligible.length) {
    steps.push({
      id: "inspect_representation",
      title: language === "zh-CN" ? "查看一个发行方版本" : "Inspect one representation",
      description: language === "zh-CN" ? "选择发行方并查看合约、行情快照和数据警告。" : "Choose an issuer and review its contract, market snapshot and data warnings.",
      sideEffects: "none",
      requiresExplicitSelection: true
    });
  }
  if (hasGaps) {
    steps.push({
      id: "review_data_gaps",
      title: language === "zh-CN" ? "查看数据缺口" : "Review data gaps",
      description: language === "zh-CN" ? "依赖比较结果前，请先确认未知的市场状态、缺失的流动性或不可用的元数据。" : "Resolve unknown market status, missing liquidity or unavailable metadata before relying on a comparison.",
      sideEffects: "none"
    });
  }
  if (assets.length > 0 && options.allowWalletExposureFollowUp !== false) {
    steps.push({
      id: "read_wallet_exposure",
      title: language === "zh-CN" ? "查看钱包持仓" : "Read wallet exposure",
      description: language === "zh-CN" ? "提供公开的 BSC 地址即可查看持仓；不会发送交易，也不需要私钥。" : "Provide a public BSC address to inspect holdings without sending a transaction or sharing a private key.",
      sideEffects: "none"
    });
  }
  return steps.slice(0, 4);
}

export function renderAssetCard(asset: AgentTokenizedAsset, options: { includeWarnings?: boolean; language?: OutputLanguage } = {}): string {
  const language = options.language ?? "en";
  const zh = language === "zh-CN";
  const market = asset.market;
  const issuerLogo = asset.issuer.logoUrl ? asset.issuer.logoUrl : "not available from verified metadata";
  const underlyingLogo = asset.metadata.underlyingLogoUrl ? asset.metadata.underlyingLogoUrl : "not available from verified metadata";
  const links = asset.links.length ? asset.links.map((link) => `[${link.label}](${link.url})`).join(" · ") : zh ? "没有经过验证的链接" : "No verified links";
  const warnings = asset.dataQuality.warnings.length ? asset.dataQuality.warnings.map((warning) => `- ${localizeEvidenceMessage(warning, language)}`).join("\n") : zh ? "- 无" : "- None";
  return [
    `### ${asset.underlyingName || asset.underlyingTicker} · ${asset.issuer.name}`,
    zh ? `视觉元数据：标的 Logo **${underlyingLogo}** · 发行方 Logo **${issuerLogo}**` : `Visual metadata: underlying logo **${underlyingLogo}** · issuer logo **${issuerLogo}**`,
    "",
    zh ? "> 证据卡片——不构成投资建议" : "> Evidence card — not an investment recommendation",
    "",
    zh ? "**资产身份**" : "**Identity**",
    ...(assetTypeLabel(asset.assetType, language) ? [zh ? `- 资产类型：**${assetTypeLabel(asset.assetType, language)}**` : `- Asset type: **${assetTypeLabel(asset.assetType, language)}**`] : []),
    zh ? `- 代币：**${value(asset.tokenSymbol)}** · 平台：**${value(asset.platformId)}** · 链：**${value(asset.chainId)}**` : `- Token: **${value(asset.tokenSymbol)}** · Platform: **${value(asset.platformId)}** · Chain: **${value(asset.chainId)}**`,
    zh ? `- 合约：\`${compactAddress(asset.contractAddress)}\`` : `- Contract: \`${compactAddress(asset.contractAddress)}\``,
    zh ? `- 覆盖情况：**${coverageLabel(asset, language)}**` : `- Coverage: **${coverageLabel(asset, language)}**`,
    ...(asset.metadata.source === "synthetic" ? [zh ? "- 数据模式：**Demo 合成数据；不是实时行情**" : "- Data mode: **Synthetic Demo Mode fixture; not live market data**"] : []),
    "",
    zh ? "**行情快照**" : "**Market snapshot**",
    ...(sourceStatusDetails(market, language) ? [zh ? `- 上游市场详情：${sourceStatusDetails(market, language)}` : `- Provider market details: ${sourceStatusDetails(market, language)}`] : []),
    zh ? `- 代币观测价格：**${value(market?.tokenPrice)}** · 标的参考价格：**${value(market?.referencePrice)}**` : `- Observed price: **${value(market?.tokenPrice)}** · Reference price: **${value(market?.referencePrice)}**`,
    zh ? `- 价差：**${value(market?.priceGapPercent, value(market?.priceGap))}** · 市场状态：**${statusLabel(asset, language)}**` : `- Price gap: **${value(market?.priceGapPercent, value(market?.priceGap))}** · Status: **${statusLabel(asset, language)}**`,
    zh ? `- 最后更新时间：**${updatedLabel(market?.tokenPriceUpdatedAt, language)}**` : `- Last update: **${updatedLabel(market?.tokenPriceUpdatedAt, language)}**`,
    zh ? `- 数据来源：**${provenanceLabel(market, language)}**` : `- Data source: **${provenanceLabel(market, language)}**`,
    "",
    zh ? "**数据质量**" : "**Data quality**",
    zh ? `- 完整度：**${completenessLabel(asset, language)}** · 缺失字段：**${asset.dataQuality.missingFields.length ? asset.dataQuality.missingFields.join(", ") : "未报告"}**` : `- Completeness: **${completenessLabel(asset, language)}** · Missing fields: **${asset.dataQuality.missingFields.length ? asset.dataQuality.missingFields.join(", ") : "None reported"}**`,
    zh ? `- 链接：${links}` : `- Links: ${links}`,
    "",
    ...(options.includeWarnings === false ? [] : [zh ? "数据警告：" : "Warnings:", warnings, ""]),
    zh ? "下一步：查看证据和数据缺口；如果决定继续交易，请明确要求创建购买计划。副作用：**无**。" : "Next safe step: review the evidence and data gaps; explicitly request a purchase plan only if you decide to continue. Side effects: **none**."
  ].join("\n");
}

export function renderComparisonTable(comparison: AssetComparison, options: { includeAggregateWarnings?: boolean; language?: OutputLanguage } = {}): string {
  const language = options.language ?? "en";
  const zh = language === "zh-CN";
  const hasFilters = Object.keys(comparison.criteria).length > 0;
  const rows = comparison.rows.map((row, index) => {
    const market = row.asset.market;
    const matchStatus = row.excludedReasons.length
      ? `${zh ? "筛选未通过" : "Excluded by filters"}: ${row.excludedReasons.map((reason) => localizeEvidenceMessage(reason, language)).join("; ")}`
      : hasFilters ? (zh ? "符合筛选条件" : "Matches filters") : (zh ? "未应用筛选" : "No filters applied");
    return [
      zh ? `#### 发行方版本 ${index + 1} · ${row.asset.issuer.name}` : `#### Representation ${index + 1} · ${row.asset.issuer.name}`,
      zh ? `- 筛选状态：**${matchStatus}** · 价差排序：**${row.rank ?? "—"}**` : `- Filter status: **${matchStatus}** · Price-gap rank: **${row.rank ?? "—"}**`,
      zh ? `- 代币：**${value(row.asset.tokenSymbol)}** · 合约：\`${row.asset.contractAddress}\`` : `- Token: **${value(row.asset.tokenSymbol)}** · Contract: \`${row.asset.contractAddress}\``,
      zh ? `- 代币观测价格：**${value(market?.tokenPrice)}** · 标的参考价格：**${value(market?.referencePrice)}**` : `- Observed price: **${value(market?.tokenPrice)}** · Reference price: **${value(market?.referencePrice)}**`,
      zh ? `- 价差：**${value(market?.priceGapPercent, value(market?.priceGap))}** · 市场状态：**${statusLabel(row.asset, language)}**` : `- Price gap: **${value(market?.priceGapPercent, value(market?.priceGap))}** · Market status: **${statusLabel(row.asset, language)}**`,
      ...(assetTypeLabel(row.asset.assetType, language) ? [zh ? `- 资产类型：**${assetTypeLabel(row.asset.assetType, language)}**` : `- Asset type: **${assetTypeLabel(row.asset.assetType, language)}**`] : []),
      ...(sourceStatusDetails(market, language) ? [zh ? `- 上游市场详情：${sourceStatusDetails(market, language)}` : `- Provider market details: ${sourceStatusDetails(market, language)}`] : []),
      zh ? `- 数据来源：**${provenanceLabel(market, language)}**` : `- Data source: **${provenanceLabel(market, language)}**`,
      zh ? `- 证据覆盖：**${coverageLabel(row.asset, language)}** · 完整度：**${completenessLabel(row.asset, language)}**` : `- Evidence coverage: **${coverageLabel(row.asset, language)}** · Completeness: **${completenessLabel(row.asset, language)}**`,
      row.asset.dataQuality.warnings.length ? `${zh ? "- 数据警告：" : "- Data warnings: "}${unique(row.asset.dataQuality.warnings).map((warning) => localizeEvidenceMessage(warning, language)).join("; ")}` : (zh ? "- 数据警告：无" : "- Data warnings: none")
    ].join("\n");
  });
  const eligibleCount = comparison.rows.filter((row) => !row.excludedReasons.length).length;
  const summary = zh
    ? eligibleCount ? `${eligibleCount} / ${comparison.rows.length} 个返回版本符合指定条件` : "没有发行方版本符合指定条件"
    : comparison.summary;
  return [
    zh ? `### ${comparison.underlyingName || comparison.underlyingTicker} 的发行方版本` : `### ${comparison.underlyingName || comparison.underlyingTicker} representations`,
    "",
    summary,
    "",
    ...rows,
    "",
    ...(options.includeAggregateWarnings === false ? [] : [comparison.warnings.length ? `${zh ? "数据警告：" : "Warnings:"}\n${comparison.warnings.map((warning) => `- ${localizeEvidenceMessage(warning, language)}`).join("\n")}` : (zh ? "数据警告：无" : "Warnings: none")]),
    "",
    zh ? "说明：筛选状态只表示发行方版本是否被所提供的筛选条件排除；比较仅包含上游本次返回的版本，目录完整性、分页和总数语义尚未验证。价差排序仅按观测到的绝对价差排序。筛选匹配或排序均不代表可交易性，也不构成交易建议。" : "Interpretation: filter status only describes whether supplied filters excluded a representation; this comparison contains the upstream-returned matches, not a verified complete catalog, and pagination/total-count semantics are unverified. Price-gap rank sorts by the observed absolute gap only. Neither indicates tradability or recommends a trade.",
    zh ? "下一步：查看证据或数据缺口；如果决定继续交易，请明确要求创建购买计划。本步骤未创建购买计划或交易。" : "Next: review the evidence or data gaps; explicitly request a purchase plan only if you decide to continue. No purchase plan or transaction was created."
  ].join("\n");
}

export function renderResearchBrief(
  assets: AgentTokenizedAsset[],
  comparison: AssetComparison,
  timing?: ResearchTiming,
  nextSteps = researchNextSteps(assets, comparison),
  options: { language?: OutputLanguage } = {}
): string {
  const language = options.language ?? "en";
  const zh = language === "zh-CN";
  const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
  const limited = assets.filter((asset) => asset.dataQuality.completeness !== "complete").length;
  const warnings = new Set([...comparison.warnings, ...assets.flatMap((asset) => asset.dataQuality.warnings)]);
  const fetchedMarketContexts = assets.filter((asset) => asset.dataQuality.coverage.marketContext === "fetched").length;
  const scopeLabel = assets.length > 0 && assets.every((asset) => asset.chainId === "56") ? " · Binance Web3 · BSC" : "";
  const actions = nextSteps.map((step, index) => [
    `${index + 1}. **${step.title}** — ${step.description}`,
    zh ? `   副作用：**无**${step.requiresExplicitSelection ? " · 必须明确选择发行方版本" : ""}` : `   Side effects: **${step.sideEffects}**${step.requiresExplicitSelection ? " · explicit representation selection required" : ""}`
  ].join("\n"));
  return [
    `# Ariadne ${zh ? "研究简报" : "research brief"}${scopeLabel} · ${comparison.underlyingName || comparison.underlyingTicker}`,
    "",
    zh ? "> 面向 Agent 的证据摘要，不构成投资建议，也不会创建交易。" : "> Evidence-first view for an existing Agent. This is not investment advice and does not create a transaction.",
    "",
    zh ? "## 概览" : "## At a glance",
    "",
    zh ? `- 找到 **${assets.length}** 个发行方版本 · **${eligible.length}** 个符合给定条件 · **${warnings.size}** 条不同的数据警告` : `- **${assets.length}** issuer representations found · **${eligible.length}** match the supplied criteria · **${warnings.size}** distinct warnings`,
    zh ? `- 身份已确认：**${assets.filter((asset) => asset.dataQuality.coverage.identity === "confirmed").length}/${assets.length}** · 行情已获取：**${fetchedMarketContexts}/${assets.length}**` : `- Identity coverage: **${assets.filter((asset) => asset.dataQuality.coverage.identity === "confirmed").length}/${assets.length} confirmed** · market context: **${fetchedMarketContexts}/${assets.length} fetched**`,
    zh ? `- **${limited}** 个版本的数据不完整；缺失数据不按 0 处理，也不代表正面信号` : `- **${limited}** representation(s) have incomplete data; missing data is not treated as zero or as a positive signal`,
    zh ? `- 建议的下一步：**${eligible.length ? "查看证据和数据缺口；决定继续后再明确创建购买计划" : "检查排除原因或放宽条件"}**` : `- Preferred next step: **${eligible.length ? "review the evidence and data gaps; explicitly create a purchase plan only after deciding to continue" : "inspect exclusions or relax the criteria"}**`,
    "",
    zh ? "## 发行方比较" : "## Cross-issuer comparison",
    "",
    renderComparisonTable(comparison, { includeAggregateWarnings: false, language }),
    "",
    zh ? "## 版本详情" : "## Representation details",
    "",
    assets.map((asset) => renderAssetCard(asset, { ...options, includeWarnings: false, language })).join("\n\n---\n\n"),
    "",
    zh ? "## 操作边界" : "## Execution boundary",
    "",
    zh ? "本研究仅为只读查询。未创建购买计划，未请求签名或交易，也未修改钱包状态或广播交易。" : "Research is read-only. No purchase plan, signature, transaction, wallet mutation or broadcast was created or requested.",
    "",
    zh ? "## Ariadne 接下来可以做什么" : "## What Ariadne can do next",
    "",
    ...actions,
    ...(timing ? [
      "",
      zh ? "## 处理耗时" : "## Product timing",
      "",
      zh ? `- Ariadne 处理耗时：**${timing.totalMs} ms**（搜索 ${timing.searchMs} ms · 行情 ${timing.marketContextMs} ms · 比较 ${timing.comparisonMs} ms · 呈现 ${timing.presentationMs} ms）。` : `- Ariadne workflow: **${timing.totalMs} ms** (search ${timing.searchMs} ms · market context ${timing.marketContextMs} ms · comparison ${timing.comparisonMs} ms · presentation ${timing.presentationMs} ms).`,
      zh ? "- 该耗时仅覆盖 MCP 处理器及 SDK/API 路径，不包含 Agent 推理和最终回答的呈现时间。" : "- This measurement covers the MCP handler and SDK/API path only; Agent reasoning and final answer rendering are excluded."
    ] : [])
  ].join("\n");
}

/** A short conversational interpretation that complements the full MCP App report. */
export function renderResearchInterpretation(
  assets: AgentTokenizedAsset[],
  comparison: AssetComparison,
  language: OutputLanguage
): string {
  const zh = language === "zh-CN";
  if (!assets.length) return zh
    ? "市场解读：本次没有识别到具体股票，因此没有请求发行方行情。可以先浏览 BSC 链上股票目录，或明确一个股票代码或公司。"
    : "Market read: no specific stock was identified, so issuer market data was not requested. Browse the BSC catalog first or name a ticker or company.";
  const rows = comparison.rows;
  const comparable = rows.filter((row) => {
    const rawGap = row.asset.market?.priceGapPercent;
    return typeof rawGap === "string" && rawGap.trim() !== "" && Number.isFinite(Number(rawGap.replace(/%$/, "")));
  });
  const unknownStatus = assets.filter((asset) => asset.market?.marketStatus !== "open" && asset.market?.marketStatus !== "closed" && asset.market?.marketStatus !== "offhours").length;
  const missingContext = assets.filter((asset) => asset.dataQuality.coverage.marketContext !== "fetched").length;
  const gaps = comparable.map((row) => ({
    issuer: row.asset.issuer.name,
    gap: Number(String(row.asset.market?.priceGapPercent ?? "").replace(/%$/, ""))
  })).filter((entry) => Number.isFinite(entry.gap));
  const smallest = [...gaps].sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))[0];
  const largest = [...gaps].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];

  if (zh) {
    const comparisonInsight = gaps.length >= 2 && smallest && largest && smallest.issuer !== largest.issuer
      ? `按本次上游价差快照，${smallest.issuer} 的价差相对较小；这只是行情快照的差异，不等同于实际成交报价或总成本。`
      : gaps.length >= 1
        ? "当前有可比较的价差快照，但发行方之间没有形成足够的差异来支持明确排序。"
        : "本次没有足够的价差数据进行有效比较。";
    const dataCaveat = unknownStatus || missingContext
      ? `${unknownStatus} 个发行方的市场状态未确认，${missingContext} 个发行方缺少完整行情上下文；具体缺口和来源时间见上方报告。`
      : "市场状态和行情上下文均已返回；数据来源与时间仍以报告列出的上游记录为准。";
    return `市场解读：本次 Binance Web3 在 BSC 返回 ${assets.length} 个发行方版本。${comparisonInsight}${dataCaveat}这里只解读当前证据，不构成投资建议。`;
  }

  const comparisonInsight = gaps.length >= 2 && smallest && largest && smallest.issuer !== largest.issuer
    ? `In this provider snapshot, ${smallest.issuer} has the smaller reported price gap; this is a snapshot comparison, not an execution quote or total cost estimate.`
    : gaps.length >= 1
      ? "Comparable gap data is available, but the current results do not show a clear issuer separation."
      : "There is not enough gap data for a meaningful comparison in this result.";
  const dataCaveat = unknownStatus || missingContext
    ? `${unknownStatus} issuer market status value(s) remain unconfirmed, and ${missingContext} issuer context(s) are incomplete; see the report for source times and missing fields.`
    : "Market status and context were returned; use the upstream provenance and timestamps in the report when interpreting freshness.";
  return `Market read: Binance Web3 returned ${assets.length} BSC issuer representation(s). ${comparisonInsight} ${dataCaveat} This summarizes the available evidence and is not investment advice.`;
}
