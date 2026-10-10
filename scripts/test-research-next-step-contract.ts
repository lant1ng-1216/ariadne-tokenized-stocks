import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["--import", "tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  env: { ...process.env, ARIADNE_MODE: "demo", BINANCE_WEB3_API_KEY: "", BINANCE_WEB3_API_SECRET: "" },
  stderr: "pipe"
});
const client = new Client({ name: "ariadne-research-next-step-contract", version: "0.1.0" });

const payloadOf = (result: Awaited<ReturnType<typeof client.callTool>>) => {
  if (result.structuredContent) return result.structuredContent as Record<string, any>;
  const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
  assert.ok(text, "MCP result must contain text or structured content");
  return JSON.parse(text) as Record<string, any>;
};

const assertNoStandaloneQuoteStep = (payload: Record<string, any>, language: "zh-CN" | "en") => {
  const presentation = String(payload.presentation ?? "");
  const nextAction = String(payload.outcome?.nextAction ?? "");
  const ids = (payload.nextSteps ?? []).map((step: { id?: string }) => step.id);
  assert.ok(!ids.includes("request_read_only_quote"), "structured next steps must not contain the unavailable standalone quote action");
  assert.doesNotMatch(presentation, /request a quote|read-only quote|获取只读报价|请求报价/i);
  assert.doesNotMatch(nextAction, /request a quote|read-only quote|获取只读报价|请求报价/i);
  if (payload.outcome?.status !== "blocked" && payload.outcome?.status !== "error") {
    assert.match(nextAction, language === "zh-CN" ? /决定继续后再明确.*创建购买计划/ : /create a purchase plan only after deciding to continue/i);
  }
};

await client.connect(transport);
try {
  const chineseResearch = payloadOf(await client.callTool({
    name: "research_tokenized_stock",
    arguments: { query: "研究 BSC 上英伟达的两个发行方版本", chainId: "56" }
  }));
  assert.match(String(chineseResearch.presentation), /代币观测价格/);
  assert.match(String(chineseResearch.presentation), /标的参考价格/);
  assert.match(String(chineseResearch.presentation), /价差/);
  assert.match(String(chineseResearch.presentation), /最后更新时间/);
  assertNoStandaloneQuoteStep(chineseResearch, "zh-CN");

  const englishResearch = payloadOf(await client.callTool({
    name: "research_tokenized_stock",
    arguments: { query: "Research both NVDA issuer representations on BSC", chainId: "56" }
  }));
  assert.match(String(englishResearch.presentation), /Observed price/);
  assert.match(String(englishResearch.presentation), /Reference price/);
  assert.match(String(englishResearch.presentation), /Price gap/);
  assert.match(String(englishResearch.presentation), /Last update/);
  assertNoStandaloneQuoteStep(englishResearch, "en");

  const paths = [
    ["discover_tokenized_assets", { query: "NVDA", chainId: "56" }, "en"],
    ["compare_asset_representations", { query: "TSLA", chainId: "56" }, "en"],
    ["screen_assets_by_preferences", { query: "特斯拉", chainId: "56", preference: { requireMarketPrice: true } }, "zh-CN"],
    ["compare_stock_wrappers", { query: "NVDA", chainId: "56" }, "en"]
  ] as const;
  for (const [name, args, language] of paths) {
    assertNoStandaloneQuoteStep(payloadOf(await client.callTool({ name, arguments: args })), language);
  }

  console.log(JSON.stringify({
    bilingualResearch: true,
    marketSnapshotPreserved: true,
    discoveryAligned: true,
    comparisonAligned: true,
    screeningAligned: true,
    wrapperComparisonAligned: true,
    standaloneQuoteStepAbsent: true,
    passed: true
  }, null, 2));
} finally {
  await client.close();
}
