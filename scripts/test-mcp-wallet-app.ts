import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { buildPurchaseApprovalAppHtml, normalizeReownProjectId } from "../src/mcp/ui/purchase-approval-app-html.js";
import { selectEip1193Provider, selectMetaMaskProvider } from "../src/mcp/ui/eip1193-discovery.js";
import { adaptWalletConnectProvider, connectWalletConnectProvider } from "../src/mcp/ui/walletconnect-provider.js";
import {
  renderWalletConnectPrompt,
  renderPurchaseApprovalView,
  renderAllowanceApprovalView,
  renderPurchasePlanMonitorView,
  readOnlyWalletConnection,
  formatAgentAllowanceReportMessage,
  formatAgentSettlementReportMessage,
  requireStableWalletConnectOrigin,
  requireSupportedWalletOpenUrl,
  runPurchaseWalletHandoff,
  WalletHandoffError,
  type Eip1193WalletProvider,
  type JsonRecord,
} from "../src/mcp/ui/purchase-approval-flow.js";

const account = "0x1111111111111111111111111111111111111111";
const txHash = `0x${"ab".repeat(32)}`;
const request = {
  from: account,
  to: "0x3333333333333333333333333333333333333333",
  value: "0x0",
  data: "0x1234",
  gas: "0x186a0",
  gasPrice: "0x5f5e100"
};
const prepared: JsonRecord = {
  planId: "fixture-plan",
  summary: "Review one confirmed BSC purchase",
  outcome: { status: "success" },
  walletRequest: { method: "eth_sendTransaction", params: [request] },
  requiredWalletContext: { account, chainId: "0x38" },
  reviewed: {
    inputAmount: "1",
    inputToken: { symbol: "USDT", contractAddress: "0x55d398326f99059ff775485246999027b3197955" },
    expectedOutput: "995000000000000000",
    minimumOutput: "990000000000000000",
    outputToken: { symbol: "NVDAB", contractAddress: "0x6666666666666666666666666666666666666666", decimals: 18 },
    spender: "0x4444444444444444444444444444444444444444",
    maxSlippageBps: 50,
    quoteExpiresAt: 1_800_000_000_000,
    maxGasCostBnb: "0.001"
  }
};

function toolResult(payload: JsonRecord) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function claimPayload() {
  return {
    planId: "fixture-plan",
    summary: "Submission reserved",
    outcome: { status: "success" },
    status: "wallet_submission_reserved",
    walletRequest: { method: "eth_sendTransaction", params: [request] },
    requiredWalletContext: { account, chainId: "0x38" }
  };
}

function makeProvider(accountToUse = account, result: unknown = txHash, responseChain = "0x38"): Eip1193WalletProvider {
  return {
    async request({ method, params }) {
      if (method === "eth_requestAccounts") return [accountToUse];
      if (method === "eth_accounts") return [accountToUse];
      if (method === "eth_chainId") return responseChain;
      if (method === "eth_sendTransaction") {
        assert.deepEqual(params, [request]);
        return result;
      }
      throw new Error(`Unexpected EIP-1193 request: ${method}`);
    }
  };
}

const rendered = renderPurchaseApprovalView(prepared);
assert.match(rendered, /Review before you connect/);
assert.match(rendered, /0x1111111111111111111111111111111111111111/);
assert.match(rendered, /Minimum 0\.99/);
assert.match(rendered, /0\.995 NVDAB/);
assert.match(rendered, /does not gate on current wallet balances/);
assert.match(rendered, /open the branded, one-time HTTPS approval page automatically/i);
assert.match(rendered, /MetaMask decides whether it can process the request and remains the signer and broadcaster/);
assert.doesNotMatch(rendered, /id="connect-submit"/);
const monitorView = renderPurchasePlanMonitorView({
  mode: "purchase_plan_review_monitor", language: "zh-CN",
  selectedAsset: { platformName: "bStocks", tokenSymbol: "NVDAB" }
}, "正在等待你自行打开外部页面");
assert.match(monitorView, /ARIADNE · BSC 终局监听/);
assert.match(monitorView, /bStocks · NVDAB/);
assert.match(monitorView, /正在等待你自行打开外部页面/);
assert.doesNotMatch(monitorView, /open-external-portal|购买计划|review-grid/, "the background monitor must not duplicate the native purchase plan or open its link");
const purchasePortalFallback = renderPurchaseApprovalView(prepared, "Host reported open, but page is not visible", undefined, false, true, "https://wallet.example/approve#token", true);
assert.match(purchasePortalFallback, /<button[^>]*id="open-external-portal"[^>]*type="button"/, "manual purchase-page fallback must be a host-routed button");
assert.doesNotMatch(purchasePortalFallback, /target="_blank"/, "sandboxed MCP App fallback must not rely on raw new-tab navigation");
assert.equal(renderWalletConnectPrompt(), "", "the QR prompt is absent before a user starts a connection");
const walletConnectPrompt = renderWalletConnectPrompt("data:image/png;base64,AA==");
assert.match(walletConnectPrompt, /role="dialog"/);
assert.match(walletConnectPrompt, /WalletConnect QR code for this BSC wallet session/);
assert.match(walletConnectPrompt, /id="cancel-wallet-connect"/);
const walletConnectInitializing = renderWalletConnectPrompt(undefined, true);
assert.match(walletConnectInitializing, /Connecting securely/);
assert.match(walletConnectInitializing, /id="cancel-wallet-connect"/);
const unregisteredHashView = renderPurchaseApprovalView(prepared, "Registration failed", txHash, false, true);
assert.match(unregisteredHashView, /Retry registering the same hash/);
assert.doesNotMatch(unregisteredHashView, /id="refresh-status"/);
assert.doesNotMatch(unregisteredHashView, /id="connect-submit"/);
const registeredHashView = renderPurchaseApprovalView(prepared, "Hash registered", txHash, true, true);
assert.match(registeredHashView, /id="refresh-status"/);
assert.doesNotMatch(registeredHashView, /id="retry-register-hash"/);
assert.doesNotMatch(renderPurchaseApprovalView({ summary: "<img src=x onerror=alert(1)>", outcome: { status: "error" } }), /<img src=x/);
assert.doesNotMatch(renderPurchaseApprovalView({ summary: "Fee blocked", outcome: { status: "error" } }), /id="connect-submit"/);
const allowanceView = renderAllowanceApprovalView({
  mode: "allowance_approval_review", summary: "Review exact allowance", outcome: { status: "success" }, approvalPlanId: "approval-plan",
  approvalPlan: {
    status: "ready_for_wallet_review", walletAddress: account,
    inputToken: { symbol: "USDT", contractAddress: "0x55d398326f99059ff775485246999027b3197955", decimals: 18 },
    outputToken: { symbol: "NVDAB", contractAddress: "0x6666666666666666666666666666666666666666", decimals: 18 },
    spender: "0x4444444444444444444444444444444444444444", amountDisplay: "1 USDT", maxGasCostBnb: "0.00001",
    estimatedMaxGasCostBnb: "0.00001", expiresAt: Date.now() + 60_000,
    purchase: { amount: "1", maxSlippageBps: 50, asset: { underlyingTicker: "NVDA" } },
    marketReview: { status: "unknown", warnings: [] }, simulation: { success: true, warnings: [] }
  }
});
assert.match(allowanceView, /Review this USDT approval/);
assert.match(allowanceView, /No stock is purchased in this approval step/);
assert.match(allowanceView, /wallet page link was not prepared/);
assert.doesNotMatch(allowanceView, /id="start-allowance-handoff"/);
assert.match(allowanceView, /0\.00001 BNB/);
const allowancePortalView = renderAllowanceApprovalView({
  mode: "allowance_approval_review", summary: "Review exact allowance", outcome: { status: "success" }, approvalPlanId: "approval-plan",
  approvalPlan: {
    status: "ready_for_wallet_review", walletAddress: account,
    inputToken: { symbol: "USDT", contractAddress: "0x55d398326f99059ff775485246999027b3197955", decimals: 18 },
    outputToken: { symbol: "NVDAB", contractAddress: "0x6666666666666666666666666666666666666666", decimals: 18 },
    spender: "0x4444444444444444444444444444444444444444", amountDisplay: "1 USDT", maxGasCostBnb: "0.00001",
    estimatedMaxGasCostBnb: "0.00001", expiresAt: Date.now() + 60_000,
    purchase: { amount: "1", maxSlippageBps: 50, asset: { underlyingTicker: "NVDA" } },
    marketReview: { status: "unknown", warnings: [] }, simulation: { success: true, warnings: [] }
  }
}, "Host reported open, but page is not visible", "https://wallet.example/approve#token");
assert.match(allowancePortalView, /<button[^>]*id="open-external-portal"[^>]*type="button"/, "the prepared allowance page must be opened through the host-routed button");
assert.match(allowancePortalView, /Open MetaMask approval page/);
const fundsWarningAllowanceView = renderAllowanceApprovalView({
  mode: "allowance_approval_review", summary: "Provider simulation could not verify wallet funds", outcome: { status: "warning" }, approvalPlanId: "approval-plan",
  approvalPlan: {
    status: "ready_for_wallet_review", walletAddress: account,
    inputToken: { symbol: "USDT", contractAddress: "0x55d398326f99059ff775485246999027b3197955", decimals: 18 },
    outputToken: { symbol: "NVDAB", contractAddress: "0x6666666666666666666666666666666666666666", decimals: 18 },
    spender: "0x4444444444444444444444444444444444444444", amountDisplay: "1 USDT", maxGasCostBnb: "0.00001",
    estimatedMaxGasCostBnb: "0.00001", expiresAt: Date.now() + 60_000,
    purchase: { amount: "1", maxSlippageBps: 50, asset: { underlyingTicker: "NVDA" } },
    marketReview: { status: "unknown", warnings: [] },
    simulation: { success: false, walletFundsOnlyFailure: true, warnings: ["Ariadne does not check wallet funds; MetaMask decides."] }
  }
});
assert.match(fundsWarningAllowanceView, /wallet page link was not prepared/, "a funds-only warning cannot create a misleading action without a prepared page URL");
assert.match(fundsWarningAllowanceView, /not a successful simulation/i);

const readOnlyView = renderPurchaseApprovalView({ mode: "wallet_connection_check", summary: "Check a BSC wallet" });
assert.match(readOnlyView, /Connect your wallet/);
assert.match(readOnlyView, /id="connect-wallet-readonly"/);
assert.match(readOnlyView, /No transaction will be requested/);
assert.doesNotMatch(readOnlyView, /eth_sendTransaction|connect-submit|spender|Minimum/);
assert.equal(requireStableWalletConnectOrigin("https://web-sandbox.oaiusercontent.com"), "https://web-sandbox.oaiusercontent.com");
assert.equal(requireStableWalletConnectOrigin("http://localhost:3000"), "http://localhost:3000", "loopback development origins are allowed");
const localLauncher = `http://127.0.0.1:8791/open-external/${"ab".repeat(16)}#${"A".repeat(43)}`;
assert.equal(requireSupportedWalletOpenUrl("https://wallet.example.test/approve#handoff.capability"), "https://wallet.example.test/approve#handoff.capability");
assert.equal(requireSupportedWalletOpenUrl(localLauncher), localLauncher, "local testing uses the relay's single system-browser launcher");
assert.throws(() => requireSupportedWalletOpenUrl("http://127.0.0.1:8791/approve#handoff.capability"), /system-browser launcher/, "local direct approval links are rejected so the wallet page is not opened in a side panel");
assert.throws(() => requireSupportedWalletOpenUrl("http://wallet.example.test/open-external/id#capability"), /system-browser launcher/);
assert.throws(() => requireStableWalletConnectOrigin("null"), /opaque null origin \(null\)/);
assert.throws(() => requireStableWalletConnectOrigin("file:///tmp/widget.html"), /unsupported or unstable app origin \(file:\/\/\/tmp\/widget\.html\)/);
assert.throws(() => requireStableWalletConnectOrigin("https://example.com/widget"), /unsupported or unstable app origin \(https:\/\/example.com\/widget\)/);
const readOnlyMethods: string[] = [];
const readOnlyResult = await readOnlyWalletConnection({
  async request({ method }) {
    readOnlyMethods.push(method);
    if (method === "eth_requestAccounts") return [account];
    if (method === "eth_chainId") return "0x38";
    throw new Error(`Unexpected read-only wallet method ${method}`);
  }
});
assert.deepEqual(readOnlyResult, { account, chainId: "0x38" });
assert.deepEqual(readOnlyMethods, ["eth_requestAccounts", "eth_chainId"], "read-only connection must never request transaction methods");
await assert.rejects(readOnlyWalletConnection({
  async request({ method }) { return method === "eth_requestAccounts" ? [account] : "0x1"; }
}), /not on BSC chain 56/);

const html = await buildPurchaseApprovalAppHtml({ reownProjectId: "a".repeat(32) });
assert.match(html, /Ariadne · Purchase review/);
assert.match(html, /eip6963:requestProvider|eth_sendTransaction/);
assert.match(html, /ui\/notifications\/tool-result/);
assert.match(html, /display_uri|WalletConnect/);
assert.match(html, /cancel-wallet-connect/);
assert.match(html, /create_external_stock_purchase_handoff/);
assert.match(html, /reconcile_external_stock_purchase_handoff/);
assert.match(html, /purchase_plan_review_monitor/);
assert.match(html, /claim_external_stock_purchase_report/);
assert.match(html, /complete_external_stock_purchase_report/);
assert.match(html, /Another active Ariadne monitor is reporting this verified result/);
assert.match(html, /reconcile_external_stock_allowance_handoff/);
assert.doesNotMatch(html, /create_external_stock_allowance_handoff/, "the app must not wait for an async server call before opening the prepared link");
assert.match(html, /The Agent host rejected the request to open the system-browser launcher/, "a rejected host open-link request must be reported clearly");
assert.match(html, /\.openLink\(\{url:/, "the visible fallback must call the MCP host open-link API instead of raw iframe navigation");
assert.match(html, /The Agent accepted the browser-open request\. Checking whether the wallet page actually loaded/, "host acceptance must trigger a real page-load check");
assert.match(html, /wallet page did not contact Ariadne within 10 seconds/, "the app must distinguish a host response from an actual page load");
assert.match(html, /The wallet page loaded successfully/, "the app may say the page opened only after the relay receives its page-load request");
assert.doesNotMatch(html, /No stock purchase is reported\. If a wallet page was already opened/, "allowance handoff setup failures must not use the ambiguous purchase-report error");
assert.match(html, /sendMessage/);
assert.match(html, /window\.ariadneConfig=\{"reownProjectId":"a{32}"\}/);
assert.equal(normalizeReownProjectId("not-a-project-id"), undefined);
assert.doesNotMatch(html, /^\s*import\s/m, "the MCP App resource must bundle all JS without an external module loader");
assert.ok(html.length < 1_500_000, `the bundled purchase review panel should remain bounded (${html.length} bytes)`);
const reportFacts = { success: true, txHash, balanceChanges: { usdt: "-1", nvdab: "+0.995" } };
assert.match(formatAgentSettlementReportMessage(reportFacts), /confirmed_success/);
assert.match(formatAgentSettlementReportMessage(reportFacts), /"txHash": "0xabab/);
assert.match(formatAgentSettlementReportMessage(reportFacts), /"balanceChanges"/);
assert.match(formatAgentAllowanceReportMessage({ success: true, noStockPurchased: true, freshPlan: { planId: "fresh-plan" } }), /"planId": "fresh-plan"/);
assert.match(formatAgentAllowanceReportMessage({ success: true, noStockPurchased: true }), /如果没有后续购买确认/);

const genericProvider = makeProvider() as Eip1193WalletProvider & { isMetaMask?: boolean };
assert.deepEqual(
  selectEip1193Provider({ injectedProvider: genericProvider }),
  { status: "selected", provider: genericProvider },
  "a single generic EIP-1193 provider should be usable without mislabeling it as MetaMask"
);
const genericProviderTwo = makeProvider("0x8888888888888888888888888888888888888888") as Eip1193WalletProvider & { isMetaMask?: boolean };
assert.deepEqual(
  selectEip1193Provider({ injectedProviders: [genericProvider, genericProviderTwo] }),
  { status: "ambiguous", candidateCount: 2 },
  "multiple generic injected wallets must not be selected arbitrarily"
);
assert.deepEqual(
  selectEip1193Provider({ announcements: [{ info: { rdns: "wallet.example" }, provider: genericProvider }] }),
  { status: "selected", provider: genericProvider },
  "a single EIP-6963 announced wallet should be usable"
);
assert.deepEqual(
  selectEip1193Provider({ announcements: [
    { info: { rdns: "wallet.one" }, provider: genericProvider },
    { info: { rdns: "wallet.two" }, provider: genericProviderTwo }
  ] }),
  { status: "ambiguous", candidateCount: 2 },
  "multiple announced generic wallets must not be selected arbitrarily"
);
assert.deepEqual(
  selectEip1193Provider({
    injectedProvider: genericProvider,
    injectedProviders: [genericProvider],
    announcements: [{ info: { rdns: "wallet.example" }, provider: genericProvider }]
  }),
  { status: "selected", provider: genericProvider },
  "the same provider exposed through multiple host mechanisms is deduplicated"
);
assert.deepEqual(
  selectEip1193Provider({
    injectedProvider: genericProvider,
    injectedProviders: [genericProvider],
    announcements: [{ info: { rdns: "wallet.two" }, provider: genericProviderTwo }]
  }),
  { status: "ambiguous", candidateCount: 2 },
  "an injected singleton and a second announced wallet must be treated as ambiguous"
);
const metaMaskOne = Object.assign(makeProvider(), { isMetaMask: true });
const metaMaskTwo = Object.assign(makeProvider("0x7777777777777777777777777777777777777777"), { isMetaMask: true });
assert.deepEqual(
  selectMetaMaskProvider({
    injectedProvider: genericProvider,
    announcements: [{ info: { rdns: "io.metamask", name: "MetaMask" }, provider: metaMaskOne }]
  }),
  { status: "selected", provider: metaMaskOne },
  "the external MetaMask page waits for and selects the exact io.metamask announcement"
);
assert.deepEqual(
  selectMetaMaskProvider({ injectedProviders: [genericProvider, metaMaskOne] }),
  { status: "selected", provider: metaMaskOne },
  "one explicit legacy MetaMask provider is a valid fallback"
);
assert.deepEqual(
  selectMetaMaskProvider({ injectedProvider: genericProvider }),
  { status: "none" },
  "a generic injected provider must never be relabelled MetaMask"
);
assert.deepEqual(
  selectMetaMaskProvider({ injectedProviders: [metaMaskOne, metaMaskTwo] }),
  { status: "ambiguous", candidateCount: 2 },
  "multiple legacy MetaMask providers fail closed"
);
assert.deepEqual(
  selectEip1193Provider({ injectedProviders: [metaMaskOne, metaMaskTwo] }),
  { status: "ambiguous", candidateCount: 2 },
  "multiple MetaMask-claiming providers must not be selected based on self-asserted labels"
);
assert.deepEqual(
  selectEip1193Provider({
    injectedProviders: [genericProvider, metaMaskOne],
    announcements: [
      { info: { rdns: "com.other.wallet", name: "Other" }, provider: genericProvider },
      { info: { rdns: "io.metamask", name: "MetaMask" }, provider: metaMaskOne }
    ],
    preferredWalletRdns: ["io.metamask"]
  }),
  { status: "selected", provider: metaMaskOne },
  "an explicit MetaMask page resolves one exact EIP-6963 MetaMask announcement in a multi-wallet browser"
);
const bridgeProvider = makeProvider();
assert.deepEqual(selectEip1193Provider({ hostBridgeProvider: bridgeProvider }), { status: "selected", provider: bridgeProvider }, "a deliberate host-side Ariadne bridge is accepted");
assert.deepEqual(
  selectEip1193Provider({
    hostBridgeProvider: bridgeProvider,
    injectedProviders: [genericProvider, genericProviderTwo],
    announcements: [{ info: { rdns: "invalid" }, provider: { request: undefined } as never }]
  }),
  { status: "selected", provider: bridgeProvider },
  "the explicit host bridge takes precedence over ambiguous injected providers"
);
assert.deepEqual(
  selectEip1193Provider({
    injectedProvider: genericProvider,
    injectedProviders: [genericProviderTwo]
  }),
  { status: "ambiguous", candidateCount: 2 },
  "the top-level injected provider and providers array are combined before selection"
);

const walletConnectCalls: Array<{ method: string; params?: unknown; chain?: string }> = [];
const walletConnectAdapter = adaptWalletConnectProvider({
  session: { namespaces: { eip155: { accounts: [`eip155:56:${account}`] } } },
  async enable() { return [account]; },
  async request(args: { method: string; params?: unknown }, chain?: string) {
    walletConnectCalls.push({ method: args.method, params: args.params, chain });
    return txHash;
  }
} as never);
assert.equal(await walletConnectAdapter.request({ method: "eth_chainId" }), "0x38");
assert.deepEqual(await walletConnectAdapter.request({ method: "eth_accounts" }), [account]);
assert.deepEqual(await walletConnectAdapter.request({ method: "eth_requestAccounts" }), [account]);
assert.equal(await walletConnectAdapter.request({ method: "eth_sendTransaction", params: [request] }), txHash);
assert.deepEqual(walletConnectCalls, [{ method: "eth_sendTransaction", params: [request], chain: "eip155:56" }], "WalletConnect requests must be constrained to BSC");

function makeWalletConnectLifecycleProvider(options: { failRelayClose?: boolean; failPairingDisconnect?: boolean; delayedPairingCreate?: boolean } = {}) {
  const providerEvents = new EventEmitter();
  const pairingEvents = new EventEmitter();
  const topics = new Set<string>();
  const counters = { pairingDisconnects: 0, sessionDisconnects: 0, relayCloses: 0, connects: 0 };
  let finishConnect: ((session: { namespaces: { eip155: { accounts: string[] } } }) => void) | undefined;
  const provider = {
    session: undefined as { namespaces: { eip155: { accounts: string[] } } } | undefined,
    events: providerEvents,
    client: {
      pairing: {
        get keys() { return [...topics]; },
        get(topic: string) {
          if (!topics.has(topic)) throw new Error("pairing not stored yet");
          return { topic };
        }
      },
      core: {
        pairing: {
          events: pairingEvents,
        async disconnect({ topic }: { topic: string }) {
          counters.pairingDisconnects += 1;
          if (options.failPairingDisconnect) throw new Error("fixture pairing disconnect failure");
          topics.delete(topic);
          }
        },
        relayer: { async transportClose() {
          await new Promise((resolve) => setTimeout(resolve, 15));
          counters.relayCloses += 1;
          if (options.failRelayClose) throw new Error("fixture relay close failure");
        } }
      }
    },
    async connect() {
      counters.connects += 1;
      const topic = "fixture-pairing-topic";
      const createPairing = () => {
        pairingEvents.emit("pairing_create", { topic });
        topics.add(topic);
        providerEvents.emit("display_uri", "wc:fixture-pairing-uri");
      };
      if (options.delayedPairingCreate) setTimeout(createPairing, 20);
      else createPairing();
      return await new Promise<{ namespaces: { eip155: { accounts: string[] } } }>((resolve) => { finishConnect = resolve; });
    },
    async disconnect() { counters.sessionDisconnects += 1; this.session = undefined; },
    async enable() { return [account]; },
    async request() { return null; }
  };
  return {
    provider,
    counters,
    approveLate() {
      const session = { namespaces: { eip155: { accounts: [`eip155:56:${account}`] } } };
      provider.session = session;
      if (!finishConnect) return false;
      finishConnect(session);
      return true;
    }
  };
}

const successfulLifecycle = makeWalletConnectLifecycleProvider();
const successfulConnection = connectWalletConnectProvider(
  "a".repeat(32), "https://agent.example", () => {}, 5_000,
  async () => successfulLifecycle.provider as never
);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(successfulLifecycle.approveLate(), true, "the fixture approves a normal WalletConnect session");
const successfulWalletConnectProvider = await successfulConnection;
assert.equal(typeof successfulWalletConnectProvider.closeSession, "function", "the panel receives a one-use session cleanup hook");
await successfulWalletConnectProvider.closeSession!();
assert.equal(successfulLifecycle.counters.sessionDisconnects, 1, "the panel disconnects the WalletConnect session after the one wallet handoff");
assert.equal(successfulLifecycle.counters.relayCloses, 1, "the one-use WalletConnect relay is closed after session disconnect");

const cancelledLifecycle = makeWalletConnectLifecycleProvider();
const storagePrefixes: string[] = [];
let cancelPairing: (() => void) | undefined;
let sawPairingUri = false;
const cancelledConnect = connectWalletConnectProvider(
  "a".repeat(32), "https://agent.example", (state) => {
    cancelPairing = state.cancel;
    if (state.uri) sawPairingUri = true;
  }, 5_000,
  async (options) => {
    storagePrefixes.push(options.customStoragePrefix ?? "");
    return cancelledLifecycle.provider as never;
  }
);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(sawPairingUri, true, "the WalletConnect pairing lifecycle exposes its URI to the in-panel QR renderer");
assert.equal(typeof cancelPairing, "function", "a cancel action exists before relay initialization starts");
cancelPairing!();
await assert.rejects(cancelledConnect, /was cancelled/);
const overlappingRetryLifecycle = makeWalletConnectLifecycleProvider();
let cancelRetry: (() => void) | undefined;
const overlappingRetry = connectWalletConnectProvider(
  "a".repeat(32), "https://agent.example", (state) => { cancelRetry = state.cancel; }, 5_000,
  async (options) => {
    storagePrefixes.push(options.customStoragePrefix ?? "");
    return overlappingRetryLifecycle.provider as never;
  }
);
await new Promise((resolve) => setTimeout(resolve, 0));
cancelRetry!();
await assert.rejects(overlappingRetry, /was cancelled/);
assert.notEqual(storagePrefixes[0], storagePrefixes[1], "overlapping WalletConnect retries must use isolated Core storage/relay identities");
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(cancelledLifecycle.counters.pairingDisconnects, 1, "cancel removes the pending pairing at the WalletConnect protocol layer");
assert.equal(overlappingRetryLifecycle.counters.relayCloses, 1, "the retry closes only its own isolated relay");
assert.equal(cancelledLifecycle.approveLate(), true, "the simulated wallet approves the still-pending underlying session after panel cancellation");
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(cancelledLifecycle.counters.sessionDisconnects, 1, `a wallet approval arriving after cancellation is immediately disconnected: ${JSON.stringify(cancelledLifecycle.counters)}`);
assert.equal(cancelledLifecycle.counters.relayCloses >= 1, true, "cancellation closes the WalletConnect relay transport");

const lateInitialization = makeWalletConnectLifecycleProvider();
let finishInitialization: ((provider: never) => void) | undefined;
let cancelDuringInitialization: (() => void) | undefined;
const initializationConnect = connectWalletConnectProvider(
  "a".repeat(32), "https://agent.example", (state) => { cancelDuringInitialization = state.cancel; }, 5,
  () => new Promise((resolve) => { finishInitialization = resolve as (provider: never) => void; })
);
assert.equal(typeof cancelDuringInitialization, "function", "the user can cancel before WalletConnect initialization finishes");
await assert.rejects(initializationConnect, /timed out/);
finishInitialization!(lateInitialization.provider as never);
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(lateInitialization.counters.connects, 0, "an initialization finishing after timeout never opens a pairing request");
assert.equal(lateInitialization.counters.relayCloses, 1, "a provider initialized after timeout is cleaned up immediately");

const cleanupFailureLifecycle = makeWalletConnectLifecycleProvider({ failRelayClose: true });
let cancelWithCleanupFailure: (() => void) | undefined;
let reportCleanupWarning!: (warning: string) => void;
const cleanupWarningObserved = new Promise<string>((resolve) => { reportCleanupWarning = resolve; });
const cleanupFailureConnect = connectWalletConnectProvider(
  "a".repeat(32), "https://agent.example", (state) => {
    cancelWithCleanupFailure = state.cancel;
    if (state.cleanupWarning) reportCleanupWarning(state.cleanupWarning);
  }, 5_000,
  async () => cleanupFailureLifecycle.provider as never
);
await new Promise((resolve) => setTimeout(resolve, 0));
cancelWithCleanupFailure!();
await assert.rejects(cleanupFailureConnect, /was cancelled/);
const cleanupWarning = await cleanupWarningObserved;
assert.match(cleanupWarning, /relay could not be closed/);
assert.match(cleanupWarning, /Revoke any Ariadne session in your wallet before retrying/);
const latePairingLifecycle = makeWalletConnectLifecycleProvider({ failPairingDisconnect: true, delayedPairingCreate: true });
let cancelBeforePairing: (() => void) | undefined;
let reportLatePairingWarning!: (warning: string) => void;
const latePairingWarningObserved = new Promise<string>((resolve) => { reportLatePairingWarning = resolve; });
const latePairingConnect = connectWalletConnectProvider(
  "a".repeat(32), "https://agent.example", (state) => {
    cancelBeforePairing = state.cancel;
    if (state.cleanupWarning) reportLatePairingWarning(state.cleanupWarning);
  }, 5_000,
  async () => latePairingLifecycle.provider as never
);
await new Promise((resolve) => setTimeout(resolve, 0));
cancelBeforePairing!();
await assert.rejects(latePairingConnect, /was cancelled/);
let lateWarningTimeout: ReturnType<typeof setTimeout> | undefined;
const latePairingWarning = await Promise.race([
  latePairingWarningObserved,
  new Promise<string>((_resolve, reject) => { lateWarningTimeout = setTimeout(() => reject(new Error("late pairing cleanup warning was not reported")), 2_000); })
]);
if (lateWarningTimeout) clearTimeout(lateWarningTimeout);
assert.match(latePairingWarning, /pending WalletConnect pairing could not be removed/);
assert.ok(latePairingLifecycle.counters.pairingDisconnects > 0, "a pairing created after cancellation is actively deleted and its failed deletion is reported");
assert.match(renderPurchaseApprovalView(prepared, latePairingWarning), /role="status"[^>]*>WalletConnect cleanup did not fully complete/);
assert.match(renderPurchaseApprovalView(prepared, latePairingWarning), /Revoke any Ariadne session in your wallet before retrying/);

const calls: string[] = [];
const successful = await runPurchaseWalletHandoff(prepared, makeProvider(), async ({ name }) => {
  calls.push(name);
  if (name === "claim_stock_purchase_wallet_submission") return toolResult(claimPayload());
  if (name === "register_stock_purchase_wallet_hash") return toolResult({ status: "wallet_transaction_observed", outcome: { status: "success" } });
  if (name === "reconcile_stock_purchase") return toolResult({ reconciliation: { status: "pending", success: false }, outcome: { status: "warning" } });
  throw new Error(`Unexpected MCP tool call: ${name}`);
});
assert.equal(successful.txHash, txHash);
assert.equal(successful.walletContextMatches, true);
assert.equal(successful.registered, true);
assert.deepEqual(calls, ["claim_stock_purchase_wallet_submission", "register_stock_purchase_wallet_hash", "reconcile_stock_purchase"]);
assert.equal((successful.reconciliation?.reconciliation as JsonRecord).status, "pending");

const registrationFailureCalls: string[] = [];
const registrationFailure = await runPurchaseWalletHandoff(prepared, makeProvider(), async ({ name }) => {
  registrationFailureCalls.push(name);
  if (name === "claim_stock_purchase_wallet_submission") return toolResult(claimPayload());
  if (name === "register_stock_purchase_wallet_hash") {
    return toolResult({ summary: "Observed transaction fields do not match the reviewed plan", outcome: { status: "error" } });
  }
  throw new Error(`Unexpected MCP tool call: ${name}`);
});
assert.equal(registrationFailure.txHash, txHash);
assert.equal(registrationFailure.registered, false);
assert.deepEqual(registrationFailureCalls, ["claim_stock_purchase_wallet_submission", "register_stock_purchase_wallet_hash"], "registration failure must retain the hash without falsely reconciling it");

let wrongAccountSends = 0;
const wrongAccountProvider: Eip1193WalletProvider = {
  async request({ method }) {
    if (method === "eth_requestAccounts") return ["0x9999999999999999999999999999999999999999"];
    if (method === "eth_chainId") return "0x38";
    if (method === "eth_sendTransaction") wrongAccountSends += 1;
    return txHash;
  }
};
const wrongCalls: string[] = [];
await assert.rejects(runPurchaseWalletHandoff(prepared, wrongAccountProvider, async ({ name }) => {
  wrongCalls.push(name);
  return toolResult(claimPayload());
}), /does not match this plan/);
assert.equal(wrongAccountSends, 0, "account mismatch must fail before eth_sendTransaction");
assert.deepEqual(wrongCalls, [], "a wrong account must not reserve an attempt or register a transaction hash");

let wrongChainSends = 0;
const wrongChainProvider: Eip1193WalletProvider = {
  async request({ method }) {
    if (method === "eth_requestAccounts") return [account];
    if (method === "eth_chainId") return "0x1";
    if (method === "eth_sendTransaction") wrongChainSends += 1;
    return txHash;
  }
};
const wrongChainCalls: string[] = [];
await assert.rejects(runPurchaseWalletHandoff(prepared, wrongChainProvider, async ({ name }) => {
  wrongChainCalls.push(name);
  return toolResult(claimPayload());
}), /not on BSC chain 56/);
assert.equal(wrongChainSends, 0);
assert.deepEqual(wrongChainCalls, [], "wrong chain must fail before claiming the attempt");

const changedContextCalls: string[] = [];
let changedContextSends = 0;
let chainReads = 0;
const changedContextProvider: Eip1193WalletProvider = {
  async request({ method }) {
    if (method === "eth_requestAccounts") return [account];
    if (method === "eth_chainId") return ++chainReads === 1 ? "0x38" : "0x1";
    if (method === "eth_accounts") return [account];
    if (method === "eth_sendTransaction") changedContextSends += 1;
    return txHash;
  }
};
await assert.rejects(runPurchaseWalletHandoff(prepared, changedContextProvider, async ({ name }) => {
  changedContextCalls.push(name);
  return toolResult(claimPayload());
}), (error: unknown) => error instanceof WalletHandoffError && error.submissionWasReserved && !error.txHash);
assert.equal(changedContextSends, 0, "an account change during the server recheck must block wallet send");
assert.deepEqual(changedContextCalls, ["claim_stock_purchase_wallet_submission"]);

const rejectedCalls: string[] = [];
await assert.rejects(runPurchaseWalletHandoff(prepared, {
  async request({ method }) {
    if (method === "eth_requestAccounts") return [account];
    if (method === "eth_accounts") return [account];
    if (method === "eth_chainId") return "0x38";
    if (method === "eth_sendTransaction") throw Object.assign(new Error("User rejected the request"), { code: 4001 });
    throw new Error(`Unexpected request ${method}`);
  }
}, async ({ name }) => {
  rejectedCalls.push(name);
  return toolResult(claimPayload());
}), (error: unknown) => error instanceof WalletHandoffError && error.submissionWasReserved && !error.txHash);
assert.deepEqual(rejectedCalls, ["claim_stock_purchase_wallet_submission"], "wallet rejection cannot register a hash or initiate reconciliation");

const invalidHashCalls: string[] = [];
await assert.rejects(runPurchaseWalletHandoff(prepared, makeProvider(account, "0x1234"), async ({ name }) => {
  invalidHashCalls.push(name);
  return toolResult(claimPayload());
}), /did not return a transaction hash/);
assert.deepEqual(invalidHashCalls, ["claim_stock_purchase_wallet_submission"]);

console.log(JSON.stringify({
  passed: true,
  builtHtmlBytes: html.length,
  verified: [
    "purchase review is a bundled Agent-native MCP App resource",
    "read-only wallet connection requests only accounts and chain ID, rejects non-BSC, and never calls a transaction method",
    "WalletConnect accepts only a declared stable HTTPS origin or loopback development origin and rejects opaque/malformed origins",
    "wallet request details and the reviewed gas cap are visible; Ariadne does not infer affordability from wallet balances",
    "provider discovery merges and deduplicates injected/EIP-6963 candidates, selects only one unique provider or the explicit host bridge, surfaces ambiguity, and preserves stable-origin WalletConnect fallback",
    "WalletConnect EIP-1193 adaptation exposes only BSC accounts and pins transaction requests to eip155:56",
      "WalletConnect sessions disconnect after one handoff; cancellation deletes pending and late-created pairings, isolates overlapping Core storage/relay identities, disconnects late approvals, times out initialization, and renders cleanup failures with revoke guidance",
      "the Agent panel auto-opens a one-time external HTTPS page, monitors the relay, and asks the host to report only after chain and balance verification",
      "the external approval page attempts EIP-1193 connection and exact transaction confirmation automatically without synthetic clicks, then returns the wallet hash",
      "the old direct provider flow remains fixture-tested for compatibility, while the current panel has no extra connect-and-review purchase button",
      "registration errors remain visibly unregistered, preserve the returned hash for same-hash recovery, and cannot trigger reconciliation or a second send",
    "wrong MetaMask account or chain is rejected before attempt reservation or eth_sendTransaction",
    "wallet rejection and malformed/missing hash never trigger hash registration or replay"
  ],
  realWalletUsed: false,
  realSignatureMade: false,
  chainBroadcasts: 0
}, null, 2));
