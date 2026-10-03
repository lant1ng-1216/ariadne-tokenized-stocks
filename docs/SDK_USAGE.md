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

- `discover_tokenized_assets` — discover issuer-aware representations and market context;
- `compare_asset_representations` — compare platforms and preserve exclusion reasons;
- `prepare_action_from_intent` — compose discovery and ActionPlan preparation without silently choosing between issuers;
- `screen_assets_by_preferences` — apply explicit user criteria without presenting investment advice;
- `analyze_portfolio_exposure` — summarize wallet exposure without rebalancing or execution.

The shortest user-facing path is `research_tokenized_stock`: it combines discovery, market context, comparison and warnings in one read-only call. Use the lower-level tools when an application needs explicit orchestration.

## Install the standalone SDK

The package can be consumed independently of Ariadne's website and MCP server. It is **not published to npm** yet; install a local tarball from a source checkout:

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
const asset = assets[0];
if (!asset) throw new Error("No NVDA representation was returned");
console.info(asset.collectionWarnings); // returned matches are not a verified complete catalog
const context = await stocks.marketContext(asset);
```

`MarketContext.provenance` identifies the provider and endpoint for each group of returned fields. Timestamped price/reference values come from `/api/v1/dex/market/rwa/price`; market status and volume are sourced from `/api/v1/dex/market/rwa/tokens`. `responseTimestampMs` is the API response time, while `assetUpdatedAtMs` / `tokenPriceUpdatedAt` is the provider's per-asset update time. They are intentionally separate. SDK market-context warnings, MCP research text and the native card state that provider timestamps alone do not guarantee data freshness because no market-data freshness SLA has been verified. Missing source or time remains absent/“Not supplied”; unknown market status or liquidity remains a data gap rather than a positive value.

`search()` returns query matches, not a verified complete set; each returned `StockAsset` carries that collection-level caveat in `collectionWarnings`. `listSnapshot()` returns the rows observed from the provider, not a verified complete catalog; its `warnings` array carries the same limitation at runtime. The provider contract available to this integration has no verified pagination or total-count semantics. In one bounded read-only BSC sample on 2026-10-03, platform metadata declared 545 token records while the token-list endpoint returned 488 unique representations. The 57-record difference remains unexplained and may reflect different provider semantics; it is not a completeness estimate. Compare the returned rows with platform metadata only as separate observations. MCP search/research and the native card similarly label results as returned matches, not a verified full universe. Demo Mode uses a limited synthetic sample and both `search()` results and `listSnapshot()` disclose that boundary.

`onRequest` receives method, path, duration, attempt, success/status/code and selected rate-limit headers; it does not include the API key, secret, signature, or request body. Avoid logging other sensitive data in your own surrounding code. `BinanceWeb3Error` exposes `status`, provider `code`, `retryable`, and optional `details`; network failures use status `0` and code `NETWORK_TIMEOUT`. `maxRetries` accepts 0–5 attempts after the first request. Both numeric-seconds and HTTP-date `Retry-After` values are honored; a provider-requested wait longer than `maxRetryDelayMs` fails fast rather than retrying too early or waiting without bound. Invalid JSON and malformed response envelopes are non-retryable errors and do not echo the response body. Defaults remain two retries, 30-second per-attempt timeout and a 10-second retry-delay budget.

The lower-level tools remain available for developers, testing and specialized orchestration. The public SDK entry point is `src/index.ts`; it exports SDK and domain APIs without requiring the website or an Agent.

The SDK preserves platform-aware asset identity, market warnings, RFQ/standard execution mode and unsigned transaction boundaries. It never stores a wallet private key or signs on behalf of a user.

**Recommended standalone-SDK execution path:** use the exported `GuardedEvmExecutionService` for a standard BSC EVM plan returned by `TokenizedStocksService.createActionPlan()`. Pass that same, unchanged in-memory plan object to `registerPrepared()`; cloned, deserialized, or modified plans are rejected. Simulate it, present the exact plan details in your own application UI and collect explicit user approval before calling `confirm(plan)`, let the user's external wallet sign the confirmed `unsignedActions[0].payload.tx`, then pass the raw signed transaction to `broadcastSigned()`. The SDK cannot independently prove that a person approved; the integrating application owns that UI and must not call `confirm()` solely because an Agent requested it or supplied the plan. The helper binds each stage to an unchanged in-process plan; checks the signed chain, sender, target, value, calldata and recovered signer; enforces the reviewed BNB gas budget; rechecks native BNB, input-token balances and the quote-declared ERC-20 spender allowance; and reserves only one broadcast attempt per plan. It does not hold keys or sign. Plans are process-local, so prepare again after a restart.

`GuardedEvmExecutionService` currently covers one standard EVM action on BNB Chain (56) with an ERC-20 input token and a quote-declared spender whose allowance can be verified; plans without that evidence are rejected. Native-input assets, RFQ and multi-action execution are not supported by this guarded helper. The exported `ExecutionService` is a generic legacy callback orchestrator, and `TransactionService.broadcastSigned()` is a raw API primitive: neither independently validates custom signer/broadcaster behavior. They are advanced integration escape hatches, not the recommended standard EVM flow. If used directly, the integrator owns signed-payload validation, fee/balance limits, immutable plan stages, explicit user approval and replay controls. The MCP standard EVM broadcast path applies its own Ariadne-enforced checks.

`TradeIntent.amount` is a positive, plain decimal quantity of the input token; `amountDecimals` must match that token's actual precision. The SDK converts this quantity to smallest units without floating-point arithmetic and rejects excess fractional precision. Integrators must verify the input token's decimals before preparing a funded action.

ActionPlan simulation preserves the quote, price-impact, input-balance and allowance checks from preparation; a standalone transaction simulation cannot manufacture a confirmable ActionPlan. Only a verified `priceImpactPercent` field is treated as a percentage. Missing or unit-ambiguous price impact blocks confirmation. If allowance is insufficient, the failed plan includes `approvalRequired` as read-only evidence; approval, allowance refresh, a new quote and a new plan are separate steps. A live funded-wallet balance check, externally signed RFQ settlement and post-trade reconciliation remain unverified.

For BSC ERC-20 input tokens, plan preparation now reads raw `balanceOf(owner)` and blocks insufficient or unavailable balances; MCP rechecks the input balance immediately before an attempted broadcast. This is read-only and does not cover native input assets or a successful funded transaction. BNB fee/value sufficiency is checked separately below.

For standard BSC EVM actions through MCP, set `maxGasCostBnb` explicitly when preparing the plan (for example, a plain decimal BNB amount). A missing or non-positive budget blocks confirmation; it cannot be added to an already confirmed plan. Before broadcast, Ariadne checks the signed transaction's maximum gas cost against that reviewed limit and requires the wallet's read-only BNB balance to cover maximum gas plus any native transaction value. The actual charged fee may be lower; balances can change before inclusion, and no funded broadcast is claimed.

In MCP, a prepared ActionPlan is bound to a process-local registry. The caller must return the unchanged plan for simulation and confirmation; changing the asset, amount, quote, safety checks or unsigned action is rejected. After successful simulation, `confirm_stock_action_plan` asks the connected MCP host to show a form elicitation containing the exact plan summary and explicit approve/decline choices. Only an accepted `decision: approve` advances the registry; decline, cancel, a malformed reply, or a host without form-elicitation support leaves the plan simulated. The host is a trusted presentation/response boundary: MCP cannot cryptographically prove that a human saw or selected the choice, so a custom client must not synthesize approval on the Agent's behalf. Approval advances Ariadne's local state only; it does not sign or broadcast. Plans expire and are lost when the MCP process restarts, so prepare a fresh plan after reconnecting. Before MCP broadcasts an externally signed EVM transaction, it decodes the raw transaction and verifies its chain ID, target, native value, calldata and recovered signer against the confirmed plan. It makes only one broadcast attempt per plan. The registry is not durable authorization; gas fees and nonce remain controlled by the external signer. The MCP RFQ submission tool also requires a confirmed, unchanged plan; because an RFQ-specific simulation/confirmation workflow is not yet available, RFQ submission through MCP remains blocked. The SDK's lower-level external signing API is a separate integrator-controlled boundary.

For RFQ routes, call `prepareRfqSigningRequest()` and pass the returned typed data to an external wallet. Submit the wallet-produced signature with `submitRfqOrder()` and poll `rfqOrderStatus()`.

## Direct web surface

The repository also contains a local web product that consumes the same normalized domain semantics without relying on an Agent transcript. `npm run web:demo` starts a deterministic browser workspace; `npm run web:live` starts a server-side credentialed, read-only workspace. The browser surface supports research/comparison, public-address exposure and explicit-issuer quote preview. It does not expose private-key input, ActionPlan creation, approval transactions, signing or broadcast.
