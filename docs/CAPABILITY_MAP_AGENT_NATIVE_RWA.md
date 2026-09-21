# Ariadne Agent-Native RWA Capability Map

## 1. Unified architecture

```text
Natural-language user intent
        ↓
Agent orchestration layer
        ↓
Ariadne semantic asset layer
        ↓
Binance Web3 API modules
        ↓
BSC and external-wallet execution layer
```

## 2. Semantic objects

| Object | Purpose | Primary source |
|---|---|---|
| `TokenizedAsset` | Underlying, issuer, platform, chain and contract identity | RWA Data API |
| `Issuer` | Platform, logo, links and explanation | RWA Data / metadata |
| `MarketContext` | Prices, reference, state, timestamps and warnings | RWA Data + Market API |
| `Comparison` | Differences and preference-filtered choices | Ariadne semantic layer |
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

### User-intent capabilities

- `discover_tokenized_assets`
- `compare_asset_representations`
- `explain_asset_identity`
- `summarize_market_context`
- `screen_assets_by_preferences`
- `analyze_portfolio_exposure`
- `prepare_action_from_intent`
- `simulate_action_plan`
- `explain_execution_readiness`

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

### Asset card

Underlying logo, issuer/platform logo, ticker, token symbol, chain, contract, token price, reference price, premium/discount, market state, liquidity, volume, freshness, warnings, issuer/explorer links and compare/quote/simulate actions.

### Comparison table

Representations side by side, normalized units, explicit missing values, no silent conversion of unknown state, preference-based ordering and evidence for each conclusion.

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
| Execute | confirm → external sign → broadcast | Status tracking |

## 7. Priority

### P0

Discovery and comparison; asset cards; market context; percentage gaps; warnings and freshness; natural-language orchestration; unified outcomes; simulation and explicit boundaries.

### P1

Theme baskets; portfolio exposure; preference screening; trading-session analysis; issuer metadata/logos; npm distribution and Demo Mode.

### P2

Scheduled DCA; automatic rebalance; event calendar; DeFi positions and calldata; b402; Agent Studio; hosted MCP and organizational permissions.

## 8. Verification matrix

| Capability | Current status | Next validation |
|---|---|---|
| MCP asset resolution | Verified | Higher-level discovery orchestration |
| Wrapper comparison | Verified | Preference-based screening |
| Market context | Verified | Percentage gap and market-state semantics |
| Outcome envelope | Implemented and tested | Multi-client presentation |
| ActionPlan | Implemented and tested | Higher-level intent entry point |
| Simulation | Verified | Multi-asset portfolio simulation |
| External signing | Boundary implemented | Funded-wallet validation |
| Broadcast | Boundary implemented | Funded-wallet validation |
| Wallet / portfolio | Basic capability verified | Portfolio view |
| DeFi Positions | Upstream blocked | Re-test after service recovery |
| Demo Mode | Not implemented | npm/hosted onboarding design |
| Asset logos / metadata | To be added | Source and caching strategy |
