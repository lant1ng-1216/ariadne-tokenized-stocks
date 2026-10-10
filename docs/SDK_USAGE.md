# SDK Usage

## MCP result handling

MCP responses preserve the domain payload and add a stable `outcome` envelope. Agents should inspect `outcome.status` before continuing:

| Status | Meaning | Agent behavior |
|---|---|---|
| `success` | The requested read or preparation step completed | Follow `nextAction` |
| `warning` | Data is available but requires review | Surface `warnings` before continuing |
| `blocked` | A safety or readiness condition prevents continuation | Do not sign or broadcast; resolve the listed condition |
| `error` | The tool could not complete the operation | Inspect `outcome.error` and do not blindly replay side effects |

`outcome.sideEffects` is `none`, `external_signature_required`, or `broadcast_possible`. This field is intentionally explicit so an Agent can distinguish a read-only response from a wallet-controlled action boundary.

## Agent-native entry points

Prefer these high-level MCP capabilities for user-facing Agent workflows:

- `browse_tokenized_stock_catalog` — explore the current BSC catalog without selecting a ticker, with issuer, type, dual-issuer and pagination filters;
- `discover_tokenized_assets` — discover issuer-aware representations and market context for a selected company or ticker;
- `compare_asset_representations` — compare platforms and preserve exclusion reasons;
- `prepare_action_from_intent` — compose discovery and ActionPlan preparation without silently choosing between issuers;
- `screen_assets_by_preferences` — apply explicit user criteria without presenting investment advice;
- `analyze_portfolio_exposure` — summarize wallet exposure without rebalancing or execution.

For an undecided user, start with `browse_tokenized_stock_catalog`, then use `research_tokenized_stock` after they select a company or ticker. The former summarizes only the current provider response; the latter combines discovery, market context, comparison and warnings in one read-only call. Use the lower-level tools when an application needs explicit orchestration.

## Install the standalone SDK

The SDK can be consumed independently of the MCP server and any Agent host. It is **not published to npm** yet; install a local tarball from a source checkout:

```bash
# Obtain and prepare the Ariadne source checkout
git clone https://github.com/lant1ng-1216/ariadne-tokenized-stocks.git
cd ariadne-tokenized-stocks
npm ci
npm run build
npm pack

# In the consuming Node.js project, use the tarball path printed by `npm pack`
npm install /absolute/path/to/ariadne-tokenized-stocks-0.1.0.tgz
```

The supported runtime is Node.js `>=22.19.0` (required by the current HTTP transport dependency). The package currently exposes an **ES module** entry point; use `import` syntax (CommonJS `require()` is not exported). `npm run build` emits JavaScript and TypeScript declarations under `dist-package/`; the package root resolves to `dist-package/index.js` and `dist-package/index.d.ts`. `npm run pack:check` builds and inspects a tarball without publishing. `npm run test:cleanroom` goes further: it builds, installs that tarball in a disposable consumer project, and verifies runtime imports and declarations. Neither command publishes the package.

## Minimal SDK use

Keep API credentials on the server or in a local environment file; never place them in browser code or commit them to source control. The client accepts optional endpoint, proxy, timeout, retry, and request-observation settings:

```ts
import { BinanceWeb3Client, TokenizedStocksService } from "ariadne-tokenized-stocks";

const client = new BinanceWeb3Client({
  apiKey: process.env.BINANCE_WEB3_API_KEY!,
  apiSecret: process.env.BINANCE_WEB3_API_SECRET!,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL, // optional; defaults to Binance Web3
  proxyUrl: process.env.HTTPS_PROXY,          // optional
  timeoutMs: 15_000,                          // optional; default 30 seconds
  maxRetries: 2,                              // optional; default 2
  maxRetryDelayMs: 5_000,                     // optional; default 10 seconds; reject longer Retry-After waits
  retryBaseDelayMs: 200,                      // optional; exponential backoff base
  onRequest: (event) => console.info("Binance request", event.method, event.path, event.durationMs)
});

const stocks = new TokenizedStocksService(client);
const assets = await stocks.search("NVDA", { chainId: "56" });
if (assets.length === 0) throw new Error("No NVDA representation was returned");
for (const candidate of assets) {
  console.info(candidate.assetId, candidate.platformId, candidate.tokenSymbol, candidate.contractAddress);
}
const selectedAssetId = process.argv[2]?.trim(); // pass the exact assetId chosen by the caller
if (!selectedAssetId) throw new Error("Choose a returned issuer representation by assetId before requesting market context");
const asset = assets.find((candidate) => candidate.assetId === selectedAssetId);
if (!asset) throw new Error("The selected assetId was not returned by this search");
console.info(asset.collectionWarnings); // returned matches are not a verified complete catalog
const context = await stocks.marketContext(asset);
```

`search()` rejects an empty or whitespace-only query locally with `TypeError: TokenizedStocksService.search query must not be empty`; no provider request is made. Non-empty queries are trimmed before they are sent.

The bundled example prints every returned issuer representation first. Run `npm run example:sdk` to inspect the list, then run `npm run example:sdk -- <assetId>` with the exact returned asset ID to fetch market context for that representation. The example does not infer an issuer choice from result order.

`MarketContext.provenance` identifies the provider and endpoint for each group of returned fields. Timestamped price/reference values come from `/api/v1/dex/market/rwa/price`; market status and volume are sourced from `/api/v1/dex/market/rwa/tokens`. `responseTimestampMs` is the API response time, while `assetUpdatedAtMs` / `tokenPriceUpdatedAt` is the provider's per-asset update time. They are intentionally separate. SDK market-context warnings, MCP research text and the native card state that provider timestamps alone do not guarantee data freshness because no market-data freshness SLA has been verified. Missing source or time remains absent/“Not supplied”; an unknown `marketStatus` category remains unknown and liquidity remains a data gap. Binance documents `openState` separately as whether the underlying market is currently tradable: only an explicit `true` satisfies the tradability check for an unknown category, and the category warning remains visible; missing/false signals and contradictory status fields remain blocking.

`search()` returns query matches, not a verified complete set; each returned `StockAsset` carries that collection-level caveat in `collectionWarnings`. `listSnapshot()` returns the rows observed from the provider, not a verified complete catalog; its `warnings` array carries the same limitation at runtime. The provider contract available to this integration has no verified pagination or total-count semantics. In one bounded read-only BSC sample on 2026-10-03, platform metadata declared 545 token records while the token-list endpoint returned 488 unique representations. The 57-record difference remains unexplained and may reflect different provider semantics; it is not a completeness estimate. Compare the returned rows with platform metadata only as separate observations. MCP search/research and the native card similarly label results as returned matches, not a verified full universe. Demo Mode uses a limited synthetic sample and both `search()` results and `listSnapshot()` disclose that boundary.

`onRequest` receives method, path, duration, attempt, success/status/code and selected rate-limit headers; it does not include the API key, secret, signature, or request body. Avoid logging other sensitive data in your own surrounding code. `BinanceWeb3Error` exposes `status`, provider `code`, `retryable`, and optional `details`; network failures use status `0` and code `NETWORK_TIMEOUT`. `maxRetries` accepts 0–5 attempts after the first request. Both numeric-seconds and HTTP-date `Retry-After` values are honored; a provider-requested wait longer than `maxRetryDelayMs` fails fast rather than retrying too early or waiting without bound. Invalid JSON and malformed response envelopes are non-retryable errors and do not echo the response body. Defaults remain two retries, 30-second per-attempt timeout and a 10-second retry-delay budget.

The lower-level tools remain available for developers, testing and specialized orchestration. The public SDK entry point is `src/index.ts`; it exports SDK and domain APIs without requiring the MCP server or an Agent.

The SDK preserves platform-aware asset identity, market warnings, RFQ/standard execution mode and unsigned transaction boundaries. It never stores a wallet private key or signs on behalf of a user.

**Recommended standalone-SDK execution path:** use the exported `GuardedEvmExecutionService` for a standard BSC EVM plan returned by `TokenizedStocksService.createBscStockPurchasePlan()`. Pass that same, unchanged in-memory plan object to `registerPrepared()`; cloned, deserialized, or modified plans are rejected. Simulate it, show the exact plan details in your application UI, and collect explicit user approval before calling `confirm(plan)`. The SDK cannot independently prove that a person approved; the integrating application owns that UI and must never call `confirm()` solely because an Agent requested or supplied the plan. Then call `sendWithWalletProvider(confirmedPlan, provider)` from the user's execute action, passing their EIP-1193 provider. Ariadne requests account access, checks the active account and BSC chain, rechecks balances and allowance, captures the pre-transaction balances, and sends the exact reviewed request through `eth_sendTransaction`; the wallet shows its native confirmation, signs and broadcasts, and returns a transaction hash. Reconcile that hash with `reconcileBroadcast()` before reporting success. Ariadne never holds keys or broadcasts on this path. The client must keep the same service instance alive through reconciliation because plan state and balance snapshots are process-local.

If an external wallet/integrator can return the raw signed transaction without broadcasting it, `broadcastSigned()` remains available. That path lets Ariadne inspect the signature, exact transaction fields and gas ceiling before Ariadne's guarded broadcaster sends it. An EIP-1193 `eth_sendTransaction` wallet instead broadcasts internally, so Ariadne can only verify the returned transaction against the reviewed plan during reconciliation. It passes the reviewed gas fields and will not report success if the observed transaction exceeds the budget; if the wallet allows a user to edit those fields, the wallet's final confirmation remains an external boundary.

`GuardedEvmExecutionService` currently covers one standard EVM action on BNB Chain (56) with an ERC-20 input token and a quote-declared spender whose allowance can be verified; plans without that evidence are rejected. Native-input assets, RFQ and multi-action execution are not supported by this guarded helper. The exported `ExecutionService` is a generic legacy callback orchestrator, and `TransactionService.broadcastSigned()` is a raw API primitive: neither independently validates custom signer/broadcaster behavior. They are advanced integration escape hatches, not the recommended standard EVM flow. If used directly, the integrator owns signed-payload validation, fee/balance limits, immutable plan stages, explicit user approval and replay controls. The MCP standard EVM broadcast path applies its own Ariadne-enforced checks.

`TradeIntent.amount` is a positive, plain decimal quantity of the input token; `amountDecimals` must match that token's actual precision. The SDK converts this quantity to smallest units without floating-point arithmetic and rejects excess fractional precision. Integrators must verify the input token's decimals before preparing a funded action.

ActionPlan simulation preserves the quote, price-impact and authorization-visibility checks from preparation; it does not use wallet token/native balances as eligibility checks. A narrowly identified provider failure that says only wallet funds could not be verified remains an explicit warning, not a successful simulation, and may proceed to the user's wallet for its decision. Other simulation failures still block. A standalone transaction simulation cannot manufacture a confirmable ActionPlan. Only a verified `priceImpactPercent` field is treated as a percentage. Missing or unit-ambiguous price impact blocks confirmation. If allowance is insufficient, the purchase plan remains visible and includes `approvalRequired`; the exact allowance, allowance finality, a fresh quote and a new purchase plan are separate steps. Approval refresh remains pending until the receipt block is finalized on BSC. One owner-funded bStocks NVDAB purchase is recorded as a dated product-pilot result; it does not verify Ondo/RFQ, other assets or the revised automatic Agent-report path in the owner host.

For BSC ERC-20 input tokens, plan preparation does not read `balanceOf(owner)` to decide whether to show the plan or open the wallet page. Ariadne captures before/after token balances only to prove settlement after a wallet-submitted transaction reaches finality. A reviewed maximum gas cost is a transaction risk limit; current wallet affordability is left to the wallet.

Every transaction plan must carry an explicit `maxSlippageBps`; Ariadne has no implicit slippage default. If a fresh quote exceeds that cap, stop and present the observed impact. Raising the cap requires an explicit new value, a fresh quote/build, and review of the new plan.

This explicit-input contract applies to SDK and lower-level plan calls. The MCP browser purchase journey first creates a wallet-free purchase intent from the selected representation and USDT amount, then resolves the active MetaMask account in the external page. That product surface applies its documented 2% maximum slippage and current provider-derived network-fee estimate before creating the exact wallet-bound plan.

For the dedicated BSC bStocks purchase/allowance MCP tools, omitting `maxGasCostBnb` lets the provider's current high-tier estimate populate a proposed maximum cap. The confirmation form labels that value as provider-derived and still requires the user to review the exact BNB cap before approving the plan. Other generic BSC plan paths require a positive `maxGasCostBnb` before confirmation. Before wallet handoff, Ariadne verifies that the transaction's maximum gas cost stays within the reviewed cap; it does not check the current BNB or USDT balance. The wallet decides if it can process the request. The actual charged fee may be lower; no funded broadcast is claimed.

In MCP, a prepared ActionPlan is bound to a process-local registry. The caller must return the unchanged plan for simulation and confirmation; changing the asset, amount, quote, safety checks or unsigned action is rejected. After successful simulation, `confirm_stock_action_plan` asks the connected MCP host to show a form elicitation containing the exact plan summary and explicit approve/decline choices. This includes market-status category, provider `openState`, and data caveats: `unknown` remains unconfirmed even when `openState=true`, so that signal must not be presented as proof that the market is open. Only an accepted `decision: approve` advances the registry; decline, cancel, a malformed reply, or a host without form-elicitation support leaves the plan simulated. The host is a trusted presentation/response boundary: MCP cannot cryptographically prove that a human saw or selected the choice, so a custom client must not synthesize approval on the Agent's behalf. Approval advances Ariadne's local state only; it does not sign or broadcast. Plans expire and are lost when the MCP process restarts, so prepare a fresh plan after reconnecting.

A wallet-capable MCP host can call `prepare_stock_purchase_wallet_request` after plan confirmation. The MCP App then opens Ariadne's configured branded HTTPS approval portal, which asks the browser wallet to confirm the exact request and returns its transaction hash through a one-time relay. The App monitors exact transaction binding, finality and balance reconciliation and asks a capable host to trigger the final Agent report. Configure `ARIADNE_WALLET_HANDOFF_RELAY_URL` and `ARIADNE_WALLET_HANDOFF_RELAY_SECRET` on the MCP process and the matching `ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN`/secret on the relay. The relay must be hosted at a stable HTTPS origin; local fixtures do not prove an Agent host will automatically open MetaMask or support automatic chat follow-up. For hosts that already supply a wallet provider, SDK callers can use `GuardedEvmExecutionService.sendWithWalletProvider()` directly. The transaction hash is checked against the exact sender, target, value, calldata and gas ceiling before reconciliation can report success. The request consumes a single attempt, including a wallet timeout; inspect wallet/chain status before taking any further action. Alternatively, a signer that returns raw signed bytes can use `broadcast_confirmed_transaction`; Ariadne validates its chain, target, native value, calldata, signer and fee cap before its guarded broadcaster makes one attempt. The MCP RFQ submission tool also requires a confirmed, unchanged plan; because an RFQ-specific simulation/confirmation workflow is not yet available, RFQ submission through MCP remains blocked.

For RFQ routes, call `prepareRfqSigningRequest()` and pass the returned typed data to an external wallet. Submit the wallet-produced signature with `submitRfqOrder()` and poll `rfqOrderStatus()`.
