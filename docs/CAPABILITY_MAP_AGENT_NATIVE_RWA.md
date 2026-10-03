# Ariadne AI-Native Onchain Finance Capability Map

## 1. Unified architecture

```text
Natural-language user → Agent host → Ariadne MCP ─┐
                                                   ├→ Shared Ariadne domain core → Binance Web3 APIs
Developer application → Ariadne TypeScript SDK ───┘                  │
                                                                     └→ External wallet boundary
```

## 2. Semantic objects

| Object | Purpose | Primary source |
|---|---|---|
| `TokenizedAsset` | Underlying, issuer, platform, chain and contract identity | RWA Data API |
| `Issuer` | Platform, logo, links and explanation | RWA Data / metadata |
| `MarketContext` | Prices, reference, state, timestamps and warnings | RWA Data + Market API |
| `Comparison` | Differences and preference-filtered choices | Ariadne interaction core |
| `Portfolio` | Wallet balance, exposure and target allocation | Wallet / Portfolio API |
| `Strategy` | User preferences, themes and rebalance rules | Agent orchestration |
| `ActionPlan` | Quote, approval, simulation and execution state | Trading / Transaction API |
| `SafetyReport` | Risk, blockers and data quality | Ariadne policy layer |
| `ExecutionBoundary` | External signing and broadcast requirements | Transaction / wallet layer |

## 3. Track-to-capability mapping

| Track | Semantic capability | User-facing experience |
|---|---|---|
| RWA Data | `discover`, `identify`, `explain` | “What tokenized NVIDIA assets exist on-chain?” |
| Market | `price`, `reference`, `gap`, `trend` | “Which representation is closest to reference?” |
| Trading | `quote`, `route`, `approval` | “Which version is executable for 10 USDT?” |
| Transaction | `simulate`, `prepare`, `broadcast` | “Simulate this without executing.” |
| Wallet | `balance`, `holdings`, `exposure` | “What tokenized stocks do I hold?” |
| DeFi | `protocol`, `apy`, `position`, `calldata` | “What DeFi compositions are available?” |
| b402 | `meter`, `pay`, `agent_service` | “Pay for one data request.” |
| Agent wallet | `sign`, `confirm`, `execute` | “Ask me to sign after confirmation.” |
| Agent Studio | `deploy`, `identity`, `runtime` | “Deploy a persistent asset Agent.” |

## 4. Tool layering

### Implemented high-level MCP capabilities

- `discover_tokenized_assets`
- `compare_asset_representations`
- `research_tokenized_stock`
- `screen_assets_by_preferences`
- `analyze_portfolio_exposure`
- `prepare_action_from_intent`
- `simulate_stock_action_plan`

These tools are deterministic MCP entry points. The calling Agent converts natural language into the MCP schema. Hosts that support MCP Apps can render Ariadne's bundled read-only research view; other hosts can use the same structured result and text response.

### Low-level adapter capabilities

- `resolve_tokenized_stock`
- `get_stock_market_context`
- `get_wallet_stock_exposure`
- `create_stock_action_plan`
- `simulate_stock_action_plan`
- `confirm_stock_action_plan`
- `submit_signed_rfq_order`
- `get_rfq_order_status`
- `broadcast_confirmed_transaction`

Low-level tools remain available for developers and testing. End-user Agents should prefer the higher-level intent capabilities.

## 5. Output components

### Current evidence card

Ticker, token symbol, issuer/platform, chain, contract, observed price, reference price, price gap, market state, coverage, missing fields, freshness when available, warnings and issuer/explorer links. Verified logos are rendered when available; unavailable metadata is labelled rather than invented.

### Current comparison presentation

Numbered issuer-aware representation entries keep the contract and market evidence together. This avoids relying on downstream Agent clients to render a Markdown table correctly. The MCP App research view presents the same evidence as issuer-aware cards with progressive detail; developers using the SDK can compose their own UI from the typed domain objects.

### Agent summary

One-line result, key differences, data gaps, risk context, suggested next action and side-effect status.

## 6. Intent-to-capability orchestration

| User intent | Agent orchestration | Final output |
|---|---|---|
| Understand an asset | discover → identify → context | Asset cards |
| Compare representations | discover → context → compare | Comparison and explanation |
| Check executability | compare → quote → safety | Execution-readiness report |
| Prepare a purchase | quote → allowance → plan → simulate | ActionPlan |
| Inspect a portfolio | wallet → holdings → market | Portfolio summary |
| Create a theme basket | screen → compare → portfolio | Basket preview |
| Simulate rebalance | portfolio → strategy → quote → simulate | Simulated changes |
| Execute a standard BSC EVM plan | register → simulate → explicit confirmation → external sign → guarded broadcast | Plan-bound signature/gas/current-balance/allowance checks and one-attempt broadcast; MCP or `GuardedEvmExecutionService` |

## 7. Priority

### P0

Discovery and comparison; asset cards; market context; percentage gaps; warnings and freshness; natural-language orchestration; unified outcomes; simulation and explicit boundaries.

### P1 — current expansion and product expression

Theme baskets; preference screening; trading-session analysis; portfolio strategy; richer execution-readiness views; npm distribution and hosted delivery decisions.

### P2

Scheduled DCA; automatic rebalance; event calendar; DeFi positions and calldata; b402; Agent Studio; hosted MCP and organizational permissions.

## 8. Verification matrix

| Capability | Current status | Next validation |
|---|---|---|
| MCP asset resolution | Verified | Broader multi-asset regression set |
| Wrapper comparison | Verified | Additional user preference combinations |
| Market context | Verified with explicit gaps | Re-test upstream market-status and liquidity coverage |
| Outcome envelope | Implemented and tested | Cross-client presentation regression |
| ActionPlan | Implemented and tested | Funded final-stage validation |
| Simulation | Verified | Multi-asset portfolio simulation |
| External signing | External-only; raw signed EVM transaction is checked against its confirmed plan | Funded-wallet validation |
| Broadcast | MCP and guarded SDK workflows validate plan, signature, gas, balances, reviewed allowance and one-attempt replay locally | Funded-wallet validation; RFQ/multi-action remain unsupported by guarded flow |
| Wallet / portfolio | MCP read-only exposure verified | Strategy and rebalance preview |
| DeFi Positions | Upstream blocked | Re-test after service recovery |
| Demo Mode | Implemented locally across directory, research, exposure and quote | Broader fixture maintenance |
| Asset logos / metadata | Implemented from official RWA and platform API fields | Cache policy and refresh observability |
