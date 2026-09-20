# Developer Experience Log

Project: Ariadne — Tokenized Stocks SDK and MCP

This log records concrete onboarding observations, API behavior, latency, errors, integration decisions and unresolved limitations. It is intentionally evidence-based and does not convert a fallback or mock into a success.

## Onboarding

- First API access was implemented through the documented `/build` endpoint and HMAC request signing.
- The SDK now exposes configurable timeout, retry count, backoff and request observations.
- Credentials are read from a local `.env` file and are never placed in MCP configuration or source control.
- The MCP server was connected to Codex and successfully called `resolve_tokenized_stock` for NVDA on BSC, returning Ondo and bStocks assets.

## RWA and market observations

- A single underlying ticker can have multiple platform, chain and contract identities.
- NVDA on BSC returned Ondo `NVDAon` and bStocks `NVDAB`.
- Token price and underlying reference price are separate fields; the SDK preserves both and calculates the gap without treating missing data as zero.
- Market status may be `unknown`; unknown is preserved as a warning rather than treated as open.
- Liquidity may be absent and must not be interpreted as zero.

## RFQ observations

- RWA routes require a wallet address for quoting.
- Official RFQ flow: quote → swap → sign `rfq.typedDataToSign` externally with EIP-712 → submit → poll order status.
- `vendor`, `orderId` and `typedDataToSign` are mandatory for a valid RFQ signing request.
- `prepareRfqSigningRequest()` exposes the exact data an external wallet must sign. Ariadne never creates or stores the signature.
- Real RFQ settlement is deferred until a funded wallet is available.

## DeFi Positions investigation

The documented request, a field-alias variant and a pagination variant were tested against the live endpoint:

`POST /api/v1/defi/data/position/list`

All three returned HTTP 200 with business code `50000` and the message `Internal server error, please retry later`. Rate-limit headers remained at a limit of 5 with 4 requests remaining. This is consistent with an upstream service error, not an authentication or rate-limit failure. Ariadne must expose this error and must never convert it into an empty position list.

## Retry and error policy

- `42900`, `50000`, `50001` and HTTP 5xx are retryable.
- Parameter and authentication errors are not blindly retried.
- `Retry-After` is preferred; otherwise exponential backoff is used.
- A deterministic test verifies `42900 → Retry-After → success`.
- Broadcast calls are never automatically replayed. Callers must query transaction or order status before reusing a signed payload.

## Safety and execution

- ActionPlan requires safety checks, simulation and explicit user confirmation.
- Expired, unsafe, unconfirmed and unsuccessfully simulated plans are rejected.
- Allowance failures stop a plan before execution.
- No-funds Preview is an intentional safe endpoint for reviewers; it does not fabricate a successful trade.
- Funded broadcast and post-trade balance verification are deferred end-to-end checks.

## Reproducible commands

```bash
npm run typecheck
npm run test:domain
npm run test:retry-policy
npm run test:mcp-config
npm run test:mcp
npm run audit:experiments
```
