# Ariadne Upgrade — Deferred and Unfinished Items

Updated: 2026-10-02

This register deliberately separates unfinished work from completed capabilities. No item below is represented as complete in the product or technical reports.

## 2026-10-02 — Final local SDK/MCP acceptance (Jev-approved; confidence 0.900)

Phase 23 passed all 24 selected local checks and Jev marked all five criteria `met` (SDK/package 1.000, MCP research 0.930, execution safety 0.990, report/ledger reconciliation 0.900, terminal scope 0.920). The phase ledger now records `delivery-complete` for the approved local core. This does not resolve the provider inventory/freshness gaps or establish identical MCP Apps rendering across other Agent hosts; those remain deferred below. No website work, publication, deployment, commit/push, wallet signing, broadcast or funded settlement is authorized by this local completion.

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
| Full Demo Mode coverage | Core MCP journeys verified; market-wide completeness not claimed | Demo now exercises seven seeded companies, issuer comparisons, filters, research and detail. Fixtures are synthetic with a fixed timestamp and do not represent a complete or live asset catalogue; broader fixture coverage is optional follow-up, not evidence of provider inventory completeness. |
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
- A read-only MCP Apps research view is implemented, and the user confirmed it appeared in the current Codex conversation. It is a research UI only: no wallet or trading controls are included. The Phase 15 form-elicitation confirmation is tested against modern and legacy MCP clients; the production MCP server and hosted Demo use SDK v2 for the 2026-07-28 multi-round-trip `input_required` response, while a v1 alias remains for the browser MCP Apps bridge to meet its bundle-size limit. On 2026-10-02, the refreshed connected synthetic server completed a host-level elicitation round-trip: the exact synthetic plan was declined and the next status read remained `simulated`; the response reported no broadcast or side effects. Jev then approved Phase 18 at confidence 0.860 after ten checks and four `met` criteria. This proves the connected decline path, not a screenshot-based visual-design assessment. No live-wallet test is allowed.
- Logo fields are modeled and rendered when available, but a verified live metadata provider is not yet integrated.
- Provider inventory and freshness remain unproven: the 2026-10-02 paired Binance sample declared 545 BSC token records but returned 488 unique directory representations; earlier snapshots recorded 538 declared. The observed `tabId` identity-set equality does not establish that filtering is ignored, and the API contract inspected so far supplies no verified pagination/completeness marker. Directory rows had no per-token update timestamp or liquidity; separate price endpoint timestamps do not establish an acceptable freshness SLA. Keep the 57-record discrepancy, omitted fields, unknown statuses and intermittent search timeout explicit until upstream semantics or stronger evidence resolves them.
- Phase 21 repaired Ariadne-owned retry parsing for both numeric and HTTP-date `Retry-After`, bounded wait/attempt handling, malformed response behavior, and documented Binance market-status normalization. Jev approved Phase 21 at **0.970** after ten selected checks and all five criteria passed. These local fixes do not resolve the upstream inventory or freshness questions, which remain deferred.
- Phase 22 added tested Chinese/English phrasing for the supported MCP research journey and native research view, including no-trade intent and faithful unknown/missing-data presentation; Jev approved it at **0.930** after 11/11 checks and five criteria passed. This does not prove that every third-party Agent host will automatically select the same tool. Only the documented/tested Chinese and English surfaces are in scope; unknown warning strings may remain in their source language, and additional locales are not implemented.
- Latency decomposition proves SDK/API/MCP timing is sub-second to approximately one second in the measured runs, but it cannot measure Codex's internal reasoning and rendering time.
- The working tree contains uncommitted Phase 15–23 changes. The current branch tracks `origin/main`; these local changes have not been committed or pushed as part of Phase 23. Do not treat a Jev phase pass as authorization to publish them.
