import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { renderResearchView } from "../src/mcp/ui/research-view.js";
import { inferOutputLanguage, localizeEvidenceMessage } from "../src/presentation/language.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["--import", "tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  env: { ...process.env, ARIADNE_MODE: "demo", BINANCE_WEB3_API_KEY: "", BINANCE_WEB3_API_SECRET: "" },
  stderr: "pipe"
});
const client = new Client({ name: "ariadne-mcp-app-ui-test", version: "0.1.0" });
await client.connect(transport);

try {
  const appTools = new Set(["discover_tokenized_assets", "compare_asset_representations", "research_tokenized_stock"]);
  const tools = await client.listTools();
  assert.equal(tools.tools.filter((candidate) => appTools.has(candidate.name)).length, 3, "all three MCP research tools must publish the catalog-scope wording");
  const uiUris = new Set<string>();
  for (const tool of tools.tools.filter((candidate) => appTools.has(candidate.name))) {
    const metadata = tool._meta as { ui?: { resourceUri?: unknown }; "ui/resourceUri"?: unknown } | undefined;
    const uri = metadata?.ui?.resourceUri ?? metadata?.["ui/resourceUri"];
    assert.equal(typeof uri, "string", `${tool.name} must link to an MCP Apps UI resource`);
    assert.match(uri as string, /^ui:\/\//);
    uiUris.add(uri as string);
  }
  assert.equal(uiUris.size, 1, "discovery, comparison and research share the same view resource");

  const resources = await client.listResources();
  assert.ok(resources.resources.some((resource) => uiUris.has(resource.uri)), "the linked UI resource must be discoverable");
  const resourceUri = [...uiUris][0]!;
  const resource = await client.readResource({ uri: resourceUri });
  const html = resource.contents.find((content) => "text" in content)?.text;
  assert.ok(html, "MCP Apps resource must return HTML");
  assert.equal(resource.contents.find((content) => "text" in content)?.mimeType, "text/html;profile=mcp-app");
  assert.match(html, /id="app"/);
  assert.match(html, /Ariadne research view|Ariadne Research View/);
  assert.match(html, /ui\/notifications\/tool-result/);
  assert.match(html, /var\(--color-text-primary/);
  assert.match(html, /var\(--font-sans/);
  assert.match(html, /background:\s*transparent/);
  assert.match(html, /data-theme="dark"/);
  assert.match(html, /@media\s*\(max-width:\s*640px\)/);
  assert.match(html, /:focus-visible\s*\{[^}]*outline:/, "interactive disclosures and links retain a visible keyboard focus indicator");
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /--host-safe-area-(?:top|right|bottom|left)/);
  assert.match(html, /grid-template-columns:\s*1fr/, "narrow evidence layouts collapse to one column");
  assert.ok(html.length < 450_000, `the bundled research view should remain bounded (${html.length} bytes)`);
  assert.doesNotMatch(html, /from\s+["']@modelcontextprotocol\/ext-apps["']/i, "the iframe resource must contain its bundled bridge client");

const query = "我想了解 BNB Chain 上英伟达股票代币有哪些发行方版本，比较价格和数据缺口；不要交易。";
  const discovery = await client.callTool({ name: "discover_tokenized_assets", arguments: { query, chainId: "56" } });
  const comparison = await client.callTool({ name: "compare_asset_representations", arguments: { query, chainId: "56" } });
  const research = await client.callTool({ name: "research_tokenized_stock", arguments: { query, chainId: "56" } });
  const readResult = (result: typeof research) => {
    const content = result.content as Array<{ type: string; text?: string }>;
    const text = content.find((item) => item.type === "text")?.text;
    assert.ok(text, "headless Agent hosts retain the readable text result");
    const parsed = JSON.parse(text!);
    assert.deepEqual(result.structuredContent, parsed, "text and structured payloads must represent the same result");
    return parsed as Record<string, any>;
  };
  const discovered = readResult(discovery);
  const compared = readResult(comparison);
  const researched = readResult(research);
  assert.equal(discovered.resolvedQuery, "NVDA");
  assert.equal(compared.comparison.rows.length, 2);
  assert.equal(researched.resolvedQuery, "NVDA");
  assert.equal(researched.outcome.sideEffects, "none");
  assert.equal(researched.assets.length, 2);
  for (const tool of tools.tools.filter((candidate) => appTools.has(candidate.name))) {
    assert.match(tool.description ?? "", /returned matches, not a verified complete catalog/i, `${tool.name} must describe its result set as returned matches rather than a complete universe`);
  }
  const ui = renderResearchView(researched);
  assert.match(ui, /^<main class="research-shell">/);
  assert.match(ui, /<section class="representations" aria-label="发行方版本">/);
  assert.match(ui, /<article class="representation" aria-label="Ondo">/);
  assert.match(ui, /<details class="evidence">\s*<summary><span>来源与数据质量<\/span>/, "evidence uses a native, labelled disclosure rather than a custom dashboard control");

  const bundledScript = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(bundledScript, "MCP Apps resource must include its executable client bundle");
  const executableBundle = bundledScript!.replace(/\s*export\s*\{[^}]*\};?\s*$/, "");
  assert.doesNotMatch(executableBundle, /^\s*(?:import|export)\s/m, "the inline bundle must not require an unresolved module loader");

  const messageListeners = new Set<(event: { data: unknown; source?: unknown }) => void>();
  const root = {
    innerHTML: "",
    addEventListener() {}
  };
  const hostMessages: Array<Record<string, any>> = [];
  const rootStyles = new Map<string, string>();
  const rootAttributes = new Map<string, string>();
  const injectedStyles = new Map<string, { id?: string; textContent?: string }>();
  const documentElement = {
    style: { height: "", colorScheme: "", setProperty(name: string, value: string) { rootStyles.set(name, value); } },
    classList: { contains: () => false },
    getAttribute: (name: string) => rootAttributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => { rootAttributes.set(name, value); },
    getBoundingClientRect: () => ({ height: 720 })
  };
  const fakeDocument = {
    querySelector: (selector: string) => selector === "#app" ? root : null,
    documentElement,
    body: {},
    head: { appendChild(element: { id?: string; textContent?: string }) { if (element.id) injectedStyles.set(element.id, element); } },
    getElementById: (id: string) => injectedStyles.get(id) ?? null,
    createElement: () => ({ style: {}, setAttribute() {}, textContent: "", id: "" })
  };
  const fakeWindow: Record<string, any> = {
    innerWidth: 1280,
    addEventListener: (type: string, listener: (event: { data: unknown; source?: unknown }) => void) => {
      if (type === "message") messageListeners.add(listener);
    },
    removeEventListener: (type: string, listener: (event: { data: unknown; source?: unknown }) => void) => {
      if (type === "message") messageListeners.delete(listener);
    }
  };
  const dispatchHostMessage = (message: Record<string, any>) => {
    for (const listener of messageListeners) listener({ data: message, source: fakeWindow.parent });
  };
  const initialHostContext = {
    theme: "light",
    styles: {
      variables: {
        "--color-background-primary": "#ffffff",
        "--color-text-primary": "#202124",
        "--font-sans": "Agent Sans, sans-serif"
      },
      css: { fonts: "@font-face { font-family: 'Agent Sans'; src: local('Arial'); }" }
    }
  };
  const fakeParent = {
    postMessage(message: Record<string, any>) {
      hostMessages.push(message);
      if (message.method === "ui/initialize" && message.id !== undefined) {
        queueMicrotask(() => dispatchHostMessage({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            protocolVersion: message.params.protocolVersion,
            hostInfo: { name: "Ariadne MCP Apps protocol test host", version: "1.0.0" },
            hostCapabilities: {},
            hostContext: initialHostContext
          }
        }));
      }
    }
  };
  fakeWindow.parent = fakeParent;
  class TestElement {
    dataset: Record<string, string>;
    constructor(view: string) { this.dataset = { view }; }
    closest(selector: string) { return selector === "button[data-view]" ? this : null; }
  }
  class TestResizeObserver {
    observe() {}
    disconnect() {}
  }
  runInNewContext(executableBundle, {
    document: fakeDocument,
    window: fakeWindow,
    Element: TestElement,
    ResizeObserver: TestResizeObserver,
    requestAnimationFrame: (callback: () => void) => { callback(); return 1; },
    cancelAnimationFrame: () => {},
    setTimeout,
    clearTimeout,
    queueMicrotask,
    URL: globalThis.URL,
    crypto: globalThis.crypto,
    console: { debug() {}, info() {}, warn() {}, error: (...args: unknown[]) => { throw new Error(args.map(String).join(" ")); }, log() {} }
  }, { timeout: 5_000 });

  const waitFor = async (predicate: () => boolean, message: string) => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    assert.fail(message);
  };
  await waitFor(() => hostMessages.some((message) => message.method === "ui/initialize"), "bundled MCP Apps client must initiate the host handshake");
  await waitFor(() => hostMessages.some((message) => message.method === "ui/notifications/initialized"), "bundled MCP Apps client must complete the host handshake");
  assert.equal(documentElement.getAttribute("data-theme"), "light", "the app applies the host's initial theme");
  assert.equal(rootStyles.get("--color-text-primary"), "#202124", "the app applies host design tokens");
  assert.ok(injectedStyles.get("__mcp-host-fonts")?.textContent?.includes("Agent Sans"), "the app uses host-provided font CSS when supplied");
  const toolResultNotification = (includeStructured: boolean) => ({
    jsonrpc: "2.0",
    method: "ui/notifications/tool-result",
    params: includeStructured
      ? research
      : { content: research.content, isError: research.isError }
  });
  dispatchHostMessage(toolResultNotification(true));
  await waitFor(() => root.innerHTML.includes("来源与数据质量"), "the bundled client must render the result delivered by its host bridge in the request language");
  assert.equal(root.innerHTML, ui, "the actual bundled app must render the same supplied research view as the server renderer");
  assert.doesNotMatch(root.innerHTML, /<form|name="privateKey"|Sign transaction|Place order/i);

  dispatchHostMessage({
    jsonrpc: "2.0",
    method: "ui/notifications/host-context-changed",
    params: {
      theme: "dark",
      styles: { variables: { "--color-text-primary": "#f4f4f5", "--color-border-primary": "#41434a" } },
      safeAreaInsets: { top: 3, right: 4, bottom: 5, left: 6 }
    }
  });
  await waitFor(() => documentElement.getAttribute("data-theme") === "dark", "host context changes must be delivered to the research view");
  assert.equal(documentElement.getAttribute("data-theme"), "dark", "host theme changes update the rendered app theme");
  assert.equal(rootStyles.get("--color-text-primary"), "#f4f4f5", "host style-token changes are applied without a reload");
  assert.equal(rootStyles.get("--host-safe-area-top"), "3px");
  assert.equal(rootStyles.get("--host-safe-area-right"), "4px");
  assert.equal(rootStyles.get("--host-safe-area-bottom"), "5px");
  assert.equal(rootStyles.get("--host-safe-area-left"), "6px", "safe-area insets are respected when the host supplies them");

  dispatchHostMessage(toolResultNotification(false));
  await waitFor(() => root.innerHTML === ui, "the bundled client must also render the text-only compatibility result");

  const identity = (asset: Record<string, any>) => `${asset.chainId}:${asset.platformId}:${asset.contractAddress?.toLowerCase()}`;
  const identities = (items: Record<string, any>[]) => items.map(identity).sort();
  assert.deepEqual(identities(discovered.assets), identities(researched.assets), "discovery and research must preserve exact asset identity");
  assert.deepEqual(identities(compared.comparison.rows.map((row: Record<string, any>) => row.asset)), identities(researched.assets), "comparison and research must use the same returned representation set");
  const evidence = (asset: Record<string, any>) => ({
    identity: identity(asset),
    metadataSource: asset.metadata?.source,
    tokenPrice: asset.market?.tokenPrice,
    referencePrice: asset.market?.referencePrice,
    priceGapPercent: asset.market?.priceGapPercent,
    tokenPriceUpdatedAt: asset.market?.tokenPriceUpdatedAt,
    provenance: asset.market?.provenance,
    missingFields: asset.dataQuality?.missingFields,
    warnings: asset.dataQuality?.warnings
  });
  assert.deepEqual(discovered.assets.map(evidence).sort((a: any, b: any) => a.identity.localeCompare(b.identity)), researched.assets.map(evidence).sort((a: any, b: any) => a.identity.localeCompare(b.identity)), "discovery and research market evidence must be identical by exact asset identity");
  assert.deepEqual(compared.comparison.rows.map((row: Record<string, any>) => evidence(row.asset)).sort((a: any, b: any) => a.identity.localeCompare(b.identity)), researched.assets.map(evidence).sort((a: any, b: any) => a.identity.localeCompare(b.identity)), "comparison and research market evidence must be identical by exact asset identity");

  assert.match(ui, /class="brand-name">Ariadne</);
  assert.match(ui, /Demo 合成数据/, "the native result must visibly distinguish synthetic fixtures from live evidence in Chinese");
  assert.match(ui, /演示模式仅包含有限的合成样本，并非完整的实时资产目录/, "the MCP result must not imply that Demo fixtures are a complete asset catalog");
  const liveCatalogWarning = "Provider search results are returned matches, not a verified complete catalog; pagination and total-count semantics are unverified";
  const liveCatalogUiEn = renderResearchView({
    ...structuredClone(researched),
    query: "Research NVDA",
    outcome: { ...researched.outcome, warnings: [liveCatalogWarning] },
    comparison: { ...researched.comparison, warnings: [liveCatalogWarning] }
  });
  const liveCatalogUiZh = renderResearchView({
    ...structuredClone(researched),
    query: "研究 NVDA",
    outcome: { ...researched.outcome, warnings: [liveCatalogWarning] },
    comparison: { ...researched.comparison, warnings: [liveCatalogWarning] }
  });
  assert.match(liveCatalogUiEn, /Provider search results are returned matches, not a verified complete catalog; pagination and total-count semantics are unverified/);
  assert.match(liveCatalogUiZh, /搜索结果仅为上游本次返回的匹配项，并非已验证的完整目录；分页和总数语义尚未验证/);
  assert.match(ui, /来源与数据质量/);
  assert.match(ui, /市场状态未知（上游报告开放标记，但未确认）/);
  assert.match(ui, /不得将其理解为 0/);
  assert.match(ui, /No source timestamp supplied|UTC/);
  assert.match(ui, /仅供研究 · 不涉及钱包或交易操作/);
  assert.match(ui, /class="representation"/);
  assert.doesNotMatch(ui, /<nav|view-tabs|overview-grid|topbar|full comparison dashboard/i, "the default result stays inline instead of rendering a separate dashboard shell");
  assert.match(ui, /Ondo|bStocks/);
  assert.match(ui, /仅供研究 · 不涉及钱包或交易操作/);
  for (const asset of researched.assets as Array<Record<string, any>>) {
    assert.equal(asset.metadata.source, "synthetic");
    const market = asset.market as Record<string, any>;
    assert.ok(ui.includes(market.tokenPrice), "view carries through the exact supplied token price");
    assert.ok(ui.includes(market.referencePrice), "view carries through the exact supplied reference price");
    assert.ok(ui.includes(market.priceGapPercent), "view carries through the exact supplied price gap");
    assert.ok(ui.includes(new Date(market.tokenPriceUpdatedAt).toISOString().replace("T", " · ").replace("Z", " UTC")), "view carries through the exact per-asset timestamp, distinct from response time");
    if (market.provenance?.length) {
      assert.ok(ui.includes(market.provenance[0].endpoint), "view identifies the supplying endpoint");
      assert.ok(ui.includes(market.provenance[0].fields.join(", ")), "view associates source with the fields it supplied");
    } else {
      assert.ok(ui.includes("未提供来源详情"), "Demo Mode must not invent a live provider or endpoint");
    }
    for (const warning of asset.dataQuality.warnings as string[]) assert.ok(ui.includes(localizeEvidenceMessage(warning, inferOutputLanguage(query))), `view includes the meaning of the exact data warning: ${warning}`);
    for (const missing of asset.dataQuality.missingFields as string[]) assert.ok(ui.includes(missing), `view includes the exact missing field: ${missing}`);
  }
  const sourcedPayload = structuredClone(researched);
  sourcedPayload.assets = sourcedPayload.assets.map((asset: Record<string, any>) => ({
    ...asset,
    market: {
      ...asset.market,
      provenance: [{
        provider: "Fixture Provider",
        endpoint: "/fixture/rwa/price",
        fields: ["tokenPrice", "tokenPriceUpdatedAt"],
        responseTimestampMs: asset.market.tokenPriceUpdatedAt + 125,
        assetUpdatedAtMs: asset.market.tokenPriceUpdatedAt
      }]
    }
  }));
  sourcedPayload.comparison.rows = sourcedPayload.assets.map((asset: Record<string, any>) => ({ asset, excludedReasons: [] }));
  const sourcedUi = renderResearchView(sourcedPayload);
  assert.ok(sourcedUi.includes("/fixture/rwa/price"), "the view renders an explicitly supplied provenance endpoint");
  assert.ok(sourcedUi.includes("tokenPrice, tokenPriceUpdatedAt"), "the view maps supplied source metadata to its fields");
  assert.ok(sourcedUi.includes(new Date(sourcedPayload.assets[0].market.provenance[0].responseTimestampMs).toISOString().replace("T", " · ").replace("Z", " UTC")), "view distinguishes provider response time from per-asset quote time");
  const failedMarketPayload = structuredClone(researched);
  failedMarketPayload.assets = failedMarketPayload.assets.map((asset: Record<string, any>) => ({
    ...asset,
    market: undefined,
    dataQuality: {
      ...asset.dataQuality,
      coverage: { ...asset.dataQuality.coverage, marketContext: "unavailable" },
      marketContextFailureCategory: "provider_failure",
      warnings: [...asset.dataQuality.warnings, "Market context could not be retrieved because the upstream provider request failed"]
    }
  }));
  failedMarketPayload.comparison.rows = failedMarketPayload.assets.map((asset: Record<string, any>) => ({ asset, excludedReasons: [] }));
  const failedMarketUi = renderResearchView(failedMarketPayload);
  assert.ok(failedMarketUi.includes("上游提供方请求失败，无法获取行情信息"), "the native view explains a safe failure category in the request language without exposing raw exception text");
  assert.doesNotMatch(ui, /\b(?:live|fresh|real-time) quote\b/i, "a timestamp must not be mistaken for a freshness guarantee");
  assert.doesNotMatch(ui, /<form|name="privateKey"|Sign transaction|Place order/i, "research UI must not create wallet or trading affordances");

  const hostile = renderResearchView({
    summary: `<img src=x onerror=alert(1)>`,
    resolvedQuery: "NVDA",
    assets: [{
      platformId: "fixture",
      tokenSymbol: "TEST",
      contractAddress: "0x123",
      issuer: { name: "<script>alert(1)</script>" },
      links: [{ label: "bad", url: "javascript:alert(1)" }],
      market: { tokenPrice: "<svg onload=alert(1)>", marketStatus: "unknown" },
      dataQuality: { coverage: {}, warnings: ["<b>unsafe warning</b>"], missingFields: [] }
    }]
  });
  assert.doesNotMatch(hostile, /<img src=x|<script>alert|<svg onload|href="javascript:/i, "untrusted tool output must not become active markup or links");
  assert.match(hostile, /&lt;img/);
  assert.match(hostile, /&lt;script&gt;/);

  const expandedPayload = structuredClone(researched);
  const repeatedAsset = structuredClone(expandedPayload.assets[0]);
  expandedPayload.assets = [
    ...expandedPayload.assets,
    { ...structuredClone(repeatedAsset), tokenSymbol: "TEST3", contractAddress: "0x333" },
    { ...structuredClone(repeatedAsset), tokenSymbol: "TEST4", contractAddress: "0x444" },
    { ...structuredClone(repeatedAsset), tokenSymbol: "TEST5", contractAddress: "0x555" }
  ];
  expandedPayload.comparison.rows = expandedPayload.assets.map((asset: Record<string, any>) => ({ asset, excludedReasons: [] }));
  const expandedUi = renderResearchView(expandedPayload);
  assert.match(expandedUi, /再显示 2 个发行方版本/, "larger result sets collapse overflow behind a native disclosure");
  for (const symbol of ["TEST3", "TEST4", "TEST5"]) assert.ok(expandedUi.includes(symbol), `progressive disclosure keeps ${symbol} present in the accessible result markup`);

  console.log(JSON.stringify({
    appResourceRegistered: true,
    appTools: appTools.size,
    bundledAppHandshakeAndToolResultRendered: true,
    structuredAndTextOnlyHostDeliveryRendered: true,
    nativeInlineHierarchy: true,
    progressiveDisclosure: true,
    hostThemeAndStyleUpdatesApplied: true,
    textAndStructuredContentAgree: true,
    sameChineseResearchIdentityAcrossTools: true,
    noTradeBoundaryPreserved: true,
    hostileDataEscaped: true,
    passed: true
  }, null, 2));
} finally {
  await transport.close();
}
