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
  assert.match(html, /\.market-status\s*\{[^}]*max-width:\s*100%[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/s, "market status badges are clipped to their grid cell");
  assert.match(html, /\.visually-hidden\s*\{[^}]*position:\s*absolute[^}]*clip:\s*rect\(0,\s*0,\s*0,\s*0\)/s, "full status descriptions stay available to the accessibility tree without affecting layout");
  assert.match(html, /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.representation-main\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/, "narrow status and quote columns can shrink independently without overlap");
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
    if (result.structuredContent) return result.structuredContent as Record<string, any>;
    return JSON.parse(text!) as Record<string, any>;
  };
  const discovered = readResult(discovery);
  const compared = readResult(comparison);
  const researched = readResult(research);
  assert.equal(discovered.resolvedQuery, "NVDA");
  assert.equal(compared.comparison.rows.length, 2);
  assert.equal(researched.resolvedQuery, "NVDA");
  assert.equal(researched.outcome.sideEffects, "none");
  assert.equal(researched.assets.length, 2);
  const researchText = (research.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "";
  assert.match(researchText, /^市场解读：/);
  assert.doesNotMatch(researchText, /发行方比较|代币价格|参考价格/);
  assert.match(researched.presentation, /市场状态：\*\*未知\*\*/, "the readable host text keeps unknown market status concise");
  assert.doesNotMatch(researched.presentation, /市场状态：\*\*市场状态未知（上游报告开放标记，但未确认）\*\*/, "provider context must not expand the inline status beside adjacent values");
  assert.match(researched.presentation, /上游报告底层市场当前可交易/, "the readable evidence preserves the provider's explicit tradability signal");
  for (const tool of tools.tools.filter((candidate) => appTools.has(candidate.name))) {
    assert.match(tool.description ?? "", /returned matches, not a verified complete catalog/i, `${tool.name} must describe its result set as returned matches rather than a complete universe`);
    assert.match(tool.description ?? "", /BSC/i, `${tool.name} must disclose the current BSC-only competition scope`);
  }
  const researchTool = tools.tools.find((candidate) => candidate.name === "research_tokenized_stock");
  assert.match(researchTool?.description ?? "", /short interpretation only; do not repeat the report table/i);
  const ui = renderResearchView(researched);
  const chainAsset = (options: { issuerId: string; issuerName: string; platformId: string; chainId: string; symbol: string; contract: string; market?: boolean }) => ({
    issuer: { id: options.issuerId, name: options.issuerName },
    platformId: options.platformId,
    chainId: options.chainId,
    contractAddress: options.contract,
    tokenSymbol: options.symbol,
    underlyingName: "Nvidia Corp",
    market: options.market ? { tokenPrice: "237.55", referencePrice: "237.14", priceGapPercent: "0.17", marketStatus: "open", tokenPriceUpdatedAt: 1791390000000 } : {},
    dataQuality: {
      coverage: { marketContext: options.market ? "fetched" : "unavailable" },
      warnings: options.market ? [] : ["Binance official API did not return market context for this chain"]
    }
  });
  const issuerChainUi = renderResearchView({
    query: "研究 NVDA",
    resolvedQuery: "NVDA",
    outcome: {
      status: "warning",
      warnings: ["An error occurred while processing Binance official market data, so it cannot be compared."],
      sideEffects: "none"
    },
    assets: [
      chainAsset({ issuerId: "bstock", issuerName: "bStocks", platformId: "bstock", chainId: "56", symbol: "NVDAB", contract: "0x01", market: true }),
      chainAsset({ issuerId: "ondo", issuerName: "Ondo", platformId: "ondo", chainId: "56", symbol: "NVDAon", contract: "0x02", market: true }),
      chainAsset({ issuerId: "ondo", issuerName: "Ondo", platformId: "ondo", chainId: "1", symbol: "NVDAon", contract: "0x03" }),
      chainAsset({ issuerId: "ondo", issuerName: "Ondo", platformId: "ondo", chainId: "CT_501", symbol: "NVDAon", contract: "0x04" })
    ]
  });
  assert.match(issuerChainUi, /2 家发行方在 BSC 有可比较行情/);
  assert.equal((issuerChainUi.match(/class="issuer-group"/g) ?? []).length, 2, "multiple deployments are grouped under two issuers");
  assert.equal((issuerChainUi.match(/class="chain-tab"/g) ?? []).length, 0, "the competition research UI does not show chain tabs");
  assert.equal((issuerChainUi.match(/class="unsupported-chain"/g) ?? []).length, 0, "unsupported chain identities are omitted instead of rendered as errors");
  assert.match(issuerChainUi, /研究 · Binance Web3 · BSC/);
  assert.doesNotMatch(issuerChainUi, /Ethereum|Solana|An error occurred while processing Binance official market data|处理 Binance 官方行情数据时发生错误/);
  assert.equal((issuerChainUi.match(/<header class="issuer-group-heading"><strong>Ondo<\/strong>/g) ?? []).length, 1, "Ondo is presented once as an issuer group, not repeated as separate issuers");
  assert.doesNotMatch(issuerChainUi, /<strong>Not available<\/strong>/, "unsupported chains must not appear as empty market comparison rows");
  assert.equal((issuerChainUi.match(/class="representation"/g) ?? []).length, 2, "only the two BSC issuer representations are rendered");
  const staleComparisonUi = renderResearchView({
    query: "研究 NVDA",
    resolvedQuery: "NVDA",
    outcome: { status: "warning", warnings: [], sideEffects: "none" },
    comparison: {
      rows: [
        { rank: 1, asset: chainAsset({ issuerId: "ondo", issuerName: "Ondo", platformId: "ondo", chainId: "56", symbol: "NVDAon", contract: "0x02", market: true }) },
        { rank: 2, asset: chainAsset({ issuerId: "ondo", issuerName: "Ondo", platformId: "ondo", chainId: "1", symbol: "NVDAon", contract: "0x03" }) },
        { rank: 3, asset: chainAsset({ issuerId: "ondo", issuerName: "Ondo", platformId: "ondo", chainId: "CT_501", symbol: "NVDAon", contract: "0x04" }) }
      ]
    }
  });
  assert.equal((staleComparisonUi.match(/class="representation"/g) ?? []).length, 1, "old comparison payloads are filtered to BSC too");
  assert.doesNotMatch(staleComparisonUi, /Ethereum|Solana|chain-tab|unsupported-chain/);
  const statusView = (query: string, marketStatus: string, openState: boolean) => renderResearchView({
    query,
    resolvedQuery: "NVDA",
    outcome: { status: "warning", warnings: [], sideEffects: "none" },
    comparison: {
      summary: "1 representation matches",
      rows: [{
        rank: 1,
        asset: {
          issuer: { name: "bStocks" },
          platformId: "bstock",
          chainId: "56",
          tokenSymbol: "NVDAB",
          underlyingName: "Nvidia Corp",
          market: { marketStatus, openState, tokenPrice: "234.54", referencePrice: "234.35", priceGapPercent: "0.08", tokenPriceUpdatedAt: 1791092933629 },
          dataQuality: {
            coverage: { marketContext: "fetched" },
            missingFields: marketStatus === "unknown" ? ["marketStatus"] : [],
            warnings: marketStatus === "unknown" && openState
              ? ["Provider reports the underlying market is currently tradable"]
              : marketStatus === "open" && openState === false
                ? ["Provider marketStatus and openState conflict; the market is treated as not open"]
                : []
          }
        }
      }]
    }
  });
  const compactUnknownEn = statusView("Research NVDA", "unknown", true);
  assert.match(compactUnknownEn, /<span class="market-status" aria-describedby="market-status-description-0" title="market status category unknown \(provider reports tradable\)">unknown<\/span>\s*<span class="visually-hidden" id="market-status-description-0">market status category unknown \(provider reports tradable\)<\/span>/i, "the concise status references a visually hidden full description");
  assert.match(compactUnknownEn, /Provider reports the underlying market is currently tradable/, "the expanded evidence preserves the explicit tradability signal");
  assert.doesNotMatch(compactUnknownEn, /<span class="market-status"[^>]*aria-label=/i, "a generic span must not use a prohibited aria-label");
  assert.match(compactUnknownEn, /<span class="quote-time">2026-10-04/, "the adjacent quote timestamp remains present");
  const compactUnknownZh = statusView("研究 NVDA", "unknown", true);
  assert.match(compactUnknownZh, /<span class="market-status" aria-describedby="market-status-description-0" title="市场状态类别未知（上游报告当前可交易）">未知<\/span>\s*<span class="visually-hidden" id="market-status-description-0">市场状态类别未知（上游报告当前可交易）<\/span>/, "the Chinese status references its full hidden description");
  assert.match(compactUnknownZh, /上游报告底层市场当前可交易/, "the expanded Chinese evidence retains the explicit tradability signal");
  const compactConflict = statusView("Research NVDA", "open", false);
  assert.match(compactConflict, /aria-describedby="market-status-description-0" title="Not open \(provider status fields conflict\)">Not open<\/span>\s*<span class="visually-hidden" id="market-status-description-0">Not open \(provider status fields conflict\)<\/span>/, "contradictory provider fields retain a conservative hidden description");
  assert.match(compactConflict, /Provider marketStatus and openState conflict; the market is treated as not open/, "contradictory provider fields remain in the evidence warnings");
  assert.match(ui, /^<main class="research-shell">/);
  assert.match(ui, /<section class="representations" aria-label="发行方版本">/);
  assert.match(ui, /<article class="representation" aria-label="Ondo">/);
  assert.match(ui, /<details class="evidence">\s*<summary><span>来源与数据质量<\/span>/, "evidence uses a native, labelled disclosure rather than a custom dashboard control");

  const bundledScript = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(bundledScript, "MCP Apps resource must include its executable client bundle");
  const executableBundle = bundledScript!.replace(/\s*export\s*\{[^}]*\};?\s*$/, "");
  assert.doesNotMatch(executableBundle, /^\s*(?:import|export)\s/m, "the inline bundle must not require an unresolved module loader");

  const messageListeners = new Set<(event: { data: unknown; source?: unknown }) => void>();
  const rootListeners = new Map<string, (event: any) => void>();
  const root = {
    innerHTML: "",
    addEventListener(type: string, listener: (event: any) => void) { rootListeners.set(type, listener); }
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
    attributes = new Map<string, string>();
    parentGroup: any;
    id = "";
    hidden = false;
    focused = false;
    constructor(dataset: Record<string, string> = {}) { this.dataset = dataset; }
    closest(selector: string) {
      if (selector === "button[data-chain-tab]" && this.dataset.chainTab) return this;
      if (selector === "[data-issuer-group]") return this.parentGroup ?? null;
      return null;
    }
    getAttribute(name: string) { return this.attributes.get(name) ?? null; }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    focus() { this.focused = true; }
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
  const chainTabOne = new TestElement({ chainTab: "one" });
  const chainTabTwo = new TestElement({ chainTab: "two" });
  const chainPanelOne = new TestElement();
  const chainPanelTwo = new TestElement();
  chainTabOne.setAttribute("aria-controls", "panel-one");
  chainTabTwo.setAttribute("aria-controls", "panel-two");
  chainPanelOne.id = "panel-one";
  chainPanelTwo.id = "panel-two";
  chainPanelTwo.hidden = true;
  const fakeIssuerGroup = {
    querySelectorAll(selector: string) {
      return selector === "[role=tab]" ? [chainTabOne, chainTabTwo] : selector === "[role=tabpanel]" ? [chainPanelOne, chainPanelTwo] : [];
    }
  };
  chainTabOne.parentGroup = fakeIssuerGroup;
  chainTabTwo.parentGroup = fakeIssuerGroup;
  rootListeners.get("click")?.({ target: chainTabTwo });
  assert.equal(chainTabTwo.getAttribute("aria-selected"), "true", "clicking a chain tab selects it");
  assert.equal(chainTabOne.getAttribute("aria-selected"), "false");
  assert.equal(chainPanelOne.hidden, true, "the previous chain panel is hidden after selection");
  assert.equal(chainPanelTwo.hidden, false, "the selected chain panel is shown");
  let prevented = false;
  rootListeners.get("keydown")?.({ target: chainTabTwo, key: "ArrowRight", preventDefault() { prevented = true; } });
  assert.equal(prevented, true, "arrow-key navigation prevents scrolling when it switches a chain tab");
  assert.equal(chainTabOne.getAttribute("aria-selected"), "true", "arrow keys move the selected chain tab");
  assert.equal(chainTabOne.focused, true, "keyboard navigation moves focus to the selected chain tab");

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
  assert.match(liveCatalogUiEn, /This shows Binance API matches; catalog completeness, pagination, and total-count semantics are unverified/);
  assert.match(liveCatalogUiZh, /本次仅展示 Binance API 返回的匹配项；目录完整性、分页和总数规则尚未验证/);
  assert.doesNotMatch(liveCatalogUiEn, new RegExp(liveCatalogWarning.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "the native UI summarizes rather than repeats the raw provider warning");
  assert.match(ui, /来源与数据质量/);
  assert.match(ui, /市场状态类别未知（上游报告当前可交易）/);
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
      chainId: "56",
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
  assert.match(expandedUi, /再显示 1 个该发行方版本/, "larger BSC issuer result sets collapse overflow behind a native disclosure");
  for (const symbol of ["TEST3", "TEST4", "TEST5"]) assert.ok(expandedUi.includes(symbol), `progressive disclosure keeps ${symbol} present in the accessible result markup`);

  console.log(JSON.stringify({
    appResourceRegistered: true,
    appTools: appTools.size,
    bundledAppHandshakeAndToolResultRendered: true,
    structuredAndTextOnlyHostDeliveryRendered: true,
    nativeInlineHierarchy: true,
    progressiveDisclosure: true,
    hostThemeAndStyleUpdatesApplied: true,
    shortAssistantTextAndCompleteStructuredReport: true,
    sameChineseResearchIdentityAcrossTools: true,
    noTradeBoundaryPreserved: true,
    hostileDataEscaped: true,
    passed: true
  }, null, 2));
} finally {
  await transport.close();
}
