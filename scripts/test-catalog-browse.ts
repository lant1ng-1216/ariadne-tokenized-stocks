import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["--import", "tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  env: { ...process.env, ARIADNE_MODE: "demo", BINANCE_WEB3_API_KEY: "", BINANCE_WEB3_API_SECRET: "" },
  stderr: "pipe",
});
const client = new Client({ name: "ariadne-catalog-browse-test", version: "0.1.0" });
await client.connect(transport);

const payloadOf = (result: Awaited<ReturnType<typeof client.callTool>>) => {
  assert.ok(result.structuredContent && typeof result.structuredContent === "object");
  return result.structuredContent as Record<string, any>;
};

try {
  const listed = await client.listTools();
  const browseTool = listed.tools.find((tool) => tool.name === "browse_tokenized_stock_catalog");
  assert.ok(browseTool, "a dedicated catalog-browse capability must be registered");
  assert.match(browseTool.description ?? "", /before choosing a specific company or ticker/i);
  assert.match(browseTool.description ?? "", /conversational stage and meaning/i);
  assert.match(browseTool.description ?? "", /not phrase triggers/i);
  assert.doesNotMatch(browseTool.description ?? "", /exact phrase|required keyword|regex/i);
  const metadata = browseTool._meta as { ui?: { resourceUri?: unknown } } | undefined;
  assert.equal(metadata?.ui?.resourceUri, "ui://ariadne/catalog-view-v1.html");

  const broad = payloadOf(await client.callTool({
    name: "browse_tokenized_stock_catalog",
    arguments: { query: "我刚开始了解链上股票，目前还没有明确想买哪一只。", chainId: "56", limit: 3 },
  }));
  assert.equal(broad.language, "zh-CN");
  assert.equal(broad.chainId, "56");
  assert.equal(broad.source, "Binance Web3");
  assert.equal(broad.scope.representationCount, 10);
  assert.equal(broad.scope.uniqueUnderlyingCount, 7);
  assert.equal(broad.scope.issuerCount, 2);
  assert.equal(broad.filtered.uniqueUnderlyingCount, 7);
  assert.equal(broad.items.length, 3);
  assert.equal(broad.pagination.hasMore, true);
  assert.equal(broad.pagination.nextOffset, 3);
  assert.deepEqual(broad.issuers.map((issuer: Record<string, any>) => issuer.platformId).sort(), ["bstock", "ondo"]);
  assert.equal(broad.outcome.sideEffects, "none");
  assert.match(broad.summary, /本次 Binance Web3/);
  assert.doesNotMatch(JSON.stringify(broad), /创建购买计划|请求钱包|签名请求/);

  const dual = payloadOf(await client.callTool({
    name: "browse_tokenized_stock_catalog",
    arguments: { query: "Show me stocks with more than one issuer", multiIssuerOnly: true, limit: 100 },
  }));
  assert.deepEqual(dual.items.map((item: Record<string, any>) => item.underlyingTicker), ["MSFT", "NVDA", "TSLA"]);
  assert.ok(dual.items.every((item: Record<string, any>) => item.issuerCount === 2));
  assert.equal(dual.dualIssuer.underlyingCount, 3);

  const ondoStocks = payloadOf(await client.callTool({
    name: "browse_tokenized_stock_catalog",
    arguments: { language: "en", issuerIds: ["ondo"], assetTypes: [1], limit: 100 },
  }));
  assert.equal(ondoStocks.language, "en");
  assert.ok(ondoStocks.items.length > 0);
  assert.ok(ondoStocks.items.every((item: Record<string, any>) => item.issuers.every((issuer: Record<string, any>) => issuer.platformId === "ondo")));
  assert.ok(ondoStocks.items.every((item: Record<string, any>) => item.assetTypes.includes(1)));

  const empty = payloadOf(await client.callTool({
    name: "browse_tokenized_stock_catalog",
    arguments: { query: "浏览目录", issuerIds: ["missing-issuer"] },
  }));
  assert.equal(empty.filtered.uniqueUnderlyingCount, 0);
  assert.equal(empty.items.length, 0);
  assert.match(empty.outcome.nextAction, /放宽发行方/);

  const researchTool = listed.tools.find((tool) => tool.name === "research_tokenized_stock");
  const discoveryTool = listed.tools.find((tool) => tool.name === "discover_tokenized_assets");
  assert.match(researchTool?.description ?? "", /use browse_tokenized_stock_catalog instead/i);
  assert.match(discoveryTool?.description ?? "", /use browse_tokenized_stock_catalog instead/i);
} finally {
  await client.close();
}

console.log("Catalog browsing contract: PASS");
