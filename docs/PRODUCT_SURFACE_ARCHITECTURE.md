# Ariadne Product Surface Architecture

## Purpose

Ariadne is the AI-native interaction infrastructure for onchain finance. It connects Agents, developers and direct users to tokenized equities and real-world assets through one shared identity, research and execution model exposed through three product surfaces:

1. the TypeScript SDK for developers and institutions;
2. the MCP server for existing Agents such as Codex and Claude Code;
3. the Ariadne web product for users who want to research and compare tokenized assets directly.

The three surfaces share one domain model and one safety policy. They differ in how intent is expressed and how evidence is presented.

## Product boundary

```text
Direct web user ───────┐
                       ├─> Ariadne interaction core ─> Binance Web3 APIs
Existing Agent ─ MCP ──┤             │
Developer ─ SDK ───────┘             ├─> comparison and research evidence
                                     ├─> ActionPlan and simulation
                                     └─> external wallet signing boundary
```

The calling Agent may interpret natural language, select tools and explain results. Ariadne remains responsible for:

- issuer-aware tokenized-asset identity;
- chain, contract and platform normalization;
- market context, reference-price comparison and data-quality warnings;
- preference-based screening without silently turning it into investment advice;
- quote, allowance, ActionPlan and simulation boundaries;
- explicit external-signature and broadcast constraints.

The local web product calls the same interaction core directly. It does not depend on Codex or Claude Code to perform a second summary before the user can understand the result; public hosting remains a separate release decision.

## Direct-product view contracts

The web product consumes structured view models rather than Markdown generated for an Agent transcript. Its research view contains:

- query identity and chain context;
- one representation object per issuer, including token identity, contract, market snapshot and comparison eligibility;
- explicit logo availability and metadata source, so a missing logo is visible instead of guessed;
- field-level metadata evidence explaining whether a logo or issuer reference was supplied or unavailable;
- coverage, completeness, missing fields, warnings and verified links;
- neutral next steps and an immutable read-only boundary;
- optional Ariadne-only timing, excluding calling-Agent reasoning and final rendering.

The direct web surface also exposes a separate public-address wallet context view. It reports holdings, matched tokenized-stock identities, unresolved holdings and unavailable prices as separate evidence states. This route is intentionally read-only and is not a wallet connection or execution surface. A separate quote-preview view requires an explicit issuer and displays route evidence without creating an ActionPlan or approval transaction.

The TypeScript adapter is implemented in `src/web/research-workspace.ts`. It is a view-model boundary, not a second business service: the SDK and MCP remain the source of asset identity, market context, comparison and safety semantics.

## Surface responsibilities

| Surface | Primary user | Current role | Product direction |
|---|---|---|---|
| TypeScript SDK | Developers, institutions and integrators | Typed access to Binance Web3 data, normalization and execution boundaries | Stable library with versioned domain contracts and examples |
| MCP server | Users of existing Agents | Agent-callable research, comparison, portfolio and action-preparation tools | High-level intent tools first; low-level tools remain for control and testing |
| Ariadne web product | Direct users and reviewers | Local Demo Mode and controlled local Live Read-only Mode implemented | Research workspace, issuer comparison, asset cards, provenance, public-address exposure, quote preview and guided read-only actions |

## Product modes

### Research mode — current core

Research mode is the most mature path. It should let a user search a company or ticker and receive:

- the available tokenized representations;
- issuer and platform identity;
- contract and chain;
- token price, reference price and price gap;
- market state and freshness;
- missing data and warnings;
- neutral next steps.

The MCP implementation exposes this through `research_tokenized_stock`. The web product presents the same evidence as issuer-aware cards, a mechanical comparison workspace and an inspectable provenance drawer.

### Preparation mode — implemented but not complete as a product experience

Preparation mode can request quotes, inspect allowance, create an ActionPlan and simulate an unsigned action. It must always show:

- which representation was selected and why;
- quote validity and price impact;
- missing liquidity or market-state information;
- allowance and balance blockers;
- whether the next step requires an external signature.

The SDK and MCP preparation boundaries are implemented and tested. The web product currently exposes explicit-issuer read-only quote evidence; ActionPlan creation and simulation remain SDK/MCP workflows until a later authorized web execution phase.

### Guarded execution mode — local path implemented, funded validation deferred

The SDK and MCP now provide Ariadne-guarded staged execution for one standard BSC EVM action: simulation, explicit confirmation, external signing, signed-transaction verification, gas and balance checks, and one broadcast attempt. No private key is handled. This synthetic/local implementation has not been validated with a funded wallet or on-chain settlement. RFQ signing/settlement, native-input assets, multi-action execution and post-trade balance reconciliation remain deferred.

## Track integration status

| Track capability | Current state | Product interpretation |
|---|---|---|
| RWA Data | Implemented and verified | Core asset identity and issuer layer |
| Market | Implemented and verified with data limitations | Research and comparison layer; missing liquidity/status remain visible |
| Trading | Quote, unsigned preparation and guarded standard-BSC-EVM execution path implemented | External signing is required; funded success remains unverified |
| Transaction | Simulation, signature/fee/balance validation and replay boundary verified locally | Synthetic tests only; funded success and settlement remain deferred |
| Wallet and portfolio | Read-only exposure implemented across MCP and local web surfaces | Portfolio context exists; unmatched assets and missing prices remain visible; automated strategy is not yet complete |
| DeFi | Protocol/investment discovery verified | Positions are upstream-blocked; deposit/redeem/LP flows are not implemented |
| b402 Payments | Not implemented | Future paid data/service distribution layer |
| Agent wallet / wallet skill | Not implemented | Future signing and delegated execution layer |
| BNB Agent Studio | Not implemented | Future hosted Agent deployment layer |
| SDK and MCP | Local product core implemented | Public package, registry and hosted distribution remain release decisions |

The goal is not to force every track into the first release. The goal is to make the interaction core broad enough that later track capabilities can be added without creating a new incompatible plugin for every workflow.

## Web product expression

The web product does not reproduce raw JSON or rely on a downstream Agent to invent the visual hierarchy. The current multi-page interface contains:

1. a natural-language or ticker search entry;
2. issuer-aware asset cards;
3. a comparison workspace for multiple representations;
4. a data-quality and provenance panel;
5. a neutral next-action area for market context, read-only quote and wallet exposure;
6. a clearly separated preparation and execution boundary.

Each asset card renders a verified underlying logo with a distinct issuer badge and shows an explicit unavailable state when upstream metadata does not provide one. Logo URLs retain API provenance and are never inferred from a ticker.

## Maturity and release gates

The current maturity boundary is:

- technical prototype: passed;
- local Agent integration: passed;
- local Hosted MCP proof of concept: passed;
- local web Demo Mode and controlled Live Read-only Mode: passed;
- product expression: multi-page visual and interaction system implemented locally; refinement remains ongoing;
- public package and Hosted MCP: not released;
- funded execution and post-trade verification: intentionally deferred;
- final competition materials: intentionally deferred.

The next product work should validate cross-surface consistency, deepen capability expression and complete public-delivery quality before adding high-risk execution or public hosting.
