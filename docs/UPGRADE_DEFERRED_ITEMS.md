# Ariadne Upgrade — Deferred and Unfinished Items

Updated: 2026-09-21

This register deliberately separates unfinished work from completed capabilities. No item below is represented as complete in the product or technical reports.

## Deferred by authorization or safety boundary

| Item | Status | Required evidence before completion |
|---|---|---|
| Real external RFQ signature | Deferred | User-controlled wallet signs a real RFQ payload and the signature is validated |
| Funded broadcast | Deferred | Explicitly authorized funded-wallet transaction succeeds on BSC |
| Post-trade balance change | Deferred | Pre/post balances are captured and reconciled after a successful transaction |
| Demo video | Deferred | Final product flow is stable and the user requests production of the video |
| Competition submission materials | Deferred | Final implementation, repository review and user approval are complete |

## Deferred product and distribution work

| Item | Status | Required work |
|---|---|---|
| Hosted MCP | Not implemented | Deploy a remote MCP endpoint with authentication and operational controls |
| MCP Registry publication | Not implemented | Package metadata, registry submission and client installation verification |
| npm publication | Not implemented | Build/publish package and verify clean `npx` installation outside the repository |
| Full Demo Mode coverage | Partial | Extend deterministic fixtures beyond the NVDA discovery path |
| Live issuer logos and metadata | Partial | Add a verified metadata source, caching policy and provenance fields |
| Agent Studio integration | Not implemented | Verify deployment, identity, runtime and automatic MCP registration |
| b402 Payments | Not implemented | Define metering, payment flow and failure/replay semantics |

## Deferred capability extensions

| Item | Status | Required work |
|---|---|---|
| Automatic DCA | Not implemented | Scheduling, user authorization, simulation and recovery policy |
| Automatic rebalancing | Not implemented | Portfolio targets, drift rules, simulation and explicit execution controls |
| Earnings/event calendar | Not implemented | Event data source, freshness and user-configurable policy |
| DeFi Positions | Upstream blocked | Re-test after the upstream service stops returning business code `50000` |
| DeFi deposit/redeem/LP flows | Not implemented | Endpoint integration, unsigned calldata validation and safety tests |
| Agent-to-Agent paid services | Not implemented | Service discovery, payment, provenance and replay handling |

## Known quality limitations

- The current high-level MCP tools are structured intent entry points; natural-language interpretation remains the responsibility of the calling Agent.
- Markdown asset cards are available, but there is no custom graphical client UI.
- Logo fields are modeled and rendered when available, but a verified live metadata provider is not yet integrated.
- Latency decomposition proves SDK/API/MCP timing is sub-second to approximately one second in the measured runs, but it cannot measure Codex's internal reasoning and rendering time.
- The public repository has not received the current unpushed upgrade changes.
