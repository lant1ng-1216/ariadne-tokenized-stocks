# Agent-Native RWA Upgrade — Phase 1 Baseline Review

Date: 2026-09-21  
Status: Ready for user review; Phase 2 is not started

## Objective

Establish an evidence-backed baseline before changing Ariadne's product model or MCP surface. The baseline must distinguish verified capabilities, partial boundaries, upstream blockers and planned work.

## Scope completed

- Audited the repository structure, package scripts, SDK services, MCP tools and current public documentation.
- Confirmed the upgrade direction: Ariadne is being evolved from a low-level API/MCP wrapper into an Agent-native tokenized-stock and RWA interaction layer.
- Preserved the existing low-level MCP tools as compatibility surfaces.
- Confirmed that the new bilingual PRD and capability-map documents are local working artifacts and have not been pushed as part of this phase.
- Ran the pre-upgrade regression suite.

## Verified baseline

| Area | Evidence | Result |
|---|---|---|
| TypeScript compilation | `npm run typecheck` | PASS |
| Domain invariants | `npm run test:domain` | PASS |
| Retry and `Retry-After` handling | `npm run test:retry-policy` | PASS |
| MCP configuration example | `npm run test:mcp-config` | PASS |
| SDK usage example | `npm run test:sdk-example` | PASS |
| Experiment integrity and coverage | `npm run audit:experiments` | PASS |

Experiment audit snapshot:

- 105 request records;
- 40 result snapshots;
- 5 safety results;
- 105 unique record IDs;
- 0 broadcasted records;
- 0 coverage gaps;
- 0 audit failures.

## Existing capability baseline

### Verified or substantially verified

- HMAC-authenticated Binance Web3 API client;
- timeout, retry, backoff and request observations;
- tokenized-stock discovery and platform-aware identity;
- market context, reference price and data warnings;
- wallet and portfolio reads;
- quote and unsigned action preparation;
- ActionPlan state machine;
- simulation and safety checks;
- MCP stdio server with 12 low-level tools;
- structured MCP `outcome` metadata;
- reproducible read-only and no-broadcast experiment records.

### Partial or deferred

- Real RFQ signing and settlement require an external wallet;
- funded broadcast and post-trade balance verification are deferred;
- DeFi Positions remains blocked by the observed upstream business code `50000`;
- Demo Mode, npm distribution, hosted MCP and registry installation are not implemented;
- high-level natural-language orchestration is not yet implemented;
- issuer metadata, logos and rich asset-card output are not yet implemented;
- portfolio strategy, theme baskets and rebalance simulation are not yet implemented.

## Baseline risks

1. The repository has local, unpushed documentation and measurement artifacts from the product-discovery work. They are intentionally preserved for review and are not treated as a clean release state.
2. The existing low-level tools expose implementation-oriented names. Phase 3 must add high-level intent tools without breaking those compatibility surfaces.
3. The current asset model does not yet contain a first-class issuer/metadata/logo representation.
4. The current market model must be extended carefully so `openState: true` and `marketStatus: unknown` remain distinguishable.
5. Absolute and percentage price gaps must be added without changing the meaning of existing fields.

## Phase gate decision

Phase 1 validation passed. No code or behavior changes were required to establish the baseline. Phase 2 may begin only after the user reviews and approves this phase report.

Phase 2 will design and implement the unified Agent-native semantic data model. It must first define schemas and compatibility rules before adding higher-level MCP capabilities.
