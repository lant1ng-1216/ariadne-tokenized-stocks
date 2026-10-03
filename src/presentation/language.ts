export type OutputLanguage = "en" | "zh-CN";

export function inferOutputLanguage(input: string): OutputLanguage {
  return /\p{Script=Han}/u.test(input) ? "zh-CN" : "en";
}

const chineseMessages: Record<string, string> = {
  "Provider timestamps alone do not guarantee data freshness; no market-data freshness SLA has been verified": "仅凭上游时间戳无法保证行情数据新鲜度；尚未验证行情数据服务等级",
  "Provider search results are returned matches, not a verified complete catalog; pagination and total-count semantics are unverified": "搜索结果仅为上游本次返回的匹配项，并非已验证的完整目录；分页和总数语义尚未验证",
  "Demo Mode uses a limited synthetic sample and is not a complete live asset catalog": "演示模式仅包含有限的合成样本，并非完整的实时资产目录",
  "The platform did not provide a recognized marketStatus": "平台未提供可识别的市场状态",
  "Liquidity was not provided and must not be interpreted as zero": "未提供流动性数据；不得将其理解为 0",
  "Market status is unknown": "市场状态未知",
  "Token price is invalid or non-positive": "代币价格无效或不大于 0",
  "Reference price is invalid or non-positive": "参考价格无效或不大于 0",
  "Per-asset price update time is unavailable": "未提供该资产的价格更新时间",
  "Market context was requested but is unavailable": "已请求行情信息，但当前无法获取",
  "Market context was not requested; prices, status and market warnings are unavailable": "未请求行情信息，因此没有价格、市场状态和相关警告",
  "Market context could not be retrieved because the provider connection failed": "提供方连接失败，无法获取行情信息",
  "Market context could not be retrieved because the upstream provider request failed": "上游提供方请求失败，无法获取行情信息",
  "Market context was omitted because provider results did not match the requested assets": "提供方返回结果与请求的资产不匹配，因此未附加行情信息",
  "Market context is unavailable because an unexpected processing error occurred": "发生未预期的处理错误，行情信息暂不可用",
  "Underlying asset logo metadata is unavailable": "未提供标的资产 Logo 元数据",
  "Issuer logo metadata is unavailable": "未提供发行方 Logo 元数据",
  "Demo Mode data is synthetic, deterministic, and not live market data": "演示模式数据为合成且可复现的数据，并非实时行情",
  "Demo snapshot timestamp is fixed for reproducibility and may be stale": "演示数据时间戳固定以保证可复现，数据可能已过时",
  "The platform did not provide a recognized market status": "平台未提供可识别的市场状态",
  "reference price is unavailable": "参考价格不可用",
  "token price is unavailable": "代币价格不可用",
  "market status is unknown": "市场状态未知",
  "issuer is outside the requested set": "发行方不在指定范围内",
  "platform is outside the requested set": "平台不在指定范围内",
  "price gap exceeds the requested limit or is unavailable": "价差超过指定上限或无法计算"
};

export function localizeEvidenceMessage(message: string, language: OutputLanguage): string {
  return language === "zh-CN" ? chineseMessages[message] ?? message : message;
}
