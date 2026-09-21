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

The lower-level tools remain available for developers, testing and specialized orchestration.

```ts
import { BinanceWeb3Client, TokenizedStocksService } from "ariadne-tokenized-stocks";

const client = new BinanceWeb3Client({
  apiKey: process.env.BINANCE_WEB3_API_KEY!,
  apiSecret: process.env.BINANCE_WEB3_API_SECRET!,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL
});

const stocks = new TokenizedStocksService(client);
const assets = await stocks.search("NVDA", { chainId: "56" });
const context = await stocks.marketContext(assets[0]);
```

The SDK preserves platform-aware asset identity, market warnings, RFQ/standard execution mode and unsigned transaction boundaries. It never stores a wallet private key or signs on behalf of a user.

For RFQ routes, call `prepareRfqSigningRequest()` and pass the returned typed data to an external wallet. Submit the wallet-produced signature with `submitRfqOrder()` and poll `rfqOrderStatus()`.
