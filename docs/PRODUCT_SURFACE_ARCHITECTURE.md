# Ariadne Product Surface Architecture

## Purpose

Ariadne is not a replacement for an Agent and it is not limited to an API wrapper. It is a shared semantic and execution-boundary layer that can be used through three product surfaces:

1. the TypeScript SDK for developers and institutions;
2. the MCP server for existing Agents such as Codex and Claude Code;
3. the Ariadne web product for users who want to research and compare tokenized assets directly.

The three surfaces should share one domain model and one safety policy. They should differ only in how intent is expressed and how evidence is presented.

## Product boundary

```text
Direct web user ───────┐
                       ├─> Ariadne semantic layer ──> Binance Web3 APIs
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

The future web product will call the same semantic layer directly. It must not depend on Codex or Claude Code to perform a second summary before the user can understand the result.

## Surface responsibilities

| Surface | Primary user | Current role | Product direction |
|---|---|---|---|
| TypeScript SDK | Developers, institutions and integrators | Typed access to Binance Web3 data, normalization and execution boundaries | Stable library with versioned domain contracts and examples |
| MCP server | Users of existing Agents | Agent-callable research, comparison, portfolio and action-preparation tools | High-level intent tools first; low-level tools remain for control and testing |
| Ariadne web product | Direct users and reviewers | Not implemented yet | Research workspace, issuer comparison, asset cards, provenance and guided read-only actions |

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

The current MCP implementation exposes this through `research_tokenized_stock`. The web implementation should present the same evidence as visual cards and comparison views.

### Preparation mode — implemented but not complete as a product experience

Preparation mode can request quotes, inspect allowance, create an ActionPlan and simulate an unsigned action. It must always show:

- which representation was selected and why;
- quote validity and price impact;
- missing liquidity or market-state information;
- allowance and balance blockers;
- whether the next step requires an external signature.

The current SDK and MCP boundaries are implemented and tested. A polished web flow remains future work.

### Execution mode — intentionally final-stage

Execution mode includes external wallet signing, RFQ settlement, funded broadcast and post-trade balance reconciliation. These are not missing because of an architectural gap; they are intentionally held for final validation with an explicitly funded and authorized wallet.

## Track integration status

| Track capability | Current state | Product interpretation |
|---|---|---|
| RWA Data | Implemented and verified | Core asset identity and issuer layer |
| Market | Implemented and verified with data limitations | Research and comparison layer; missing liquidity/status remain visible |
| Trading | Quote and unsigned preparation implemented | Read-only quote and preparation are mature; settlement remains final-stage |
| Transaction | Simulation and rejection boundaries verified | Safe preparation layer; funded success remains deferred |
| Wallet and portfolio | Read-only exposure implemented | Portfolio context exists; automated strategy is not yet complete |
| DeFi | Protocol/investment discovery verified | Positions are upstream-blocked; deposit/redeem/LP flows are not implemented |
| b402 Payments | Not implemented | Future paid data/service distribution layer |
| Agent wallet / wallet skill | Not implemented | Future signing and delegated execution layer |
| BNB Agent Studio | Not implemented | Future hosted Agent deployment layer |
| SDK and MCP | Local product core implemented | Public package, registry and hosted distribution remain release decisions |

The goal is not to force every track into the first release. The goal is to make the semantic layer broad enough that later track capabilities can be added without creating a new incompatible plugin for every workflow.

## Web product expression

The web product should not reproduce raw JSON or rely on a downstream Agent to invent the visual hierarchy. The initial interface should contain:

1. a natural-language or ticker search entry;
2. issuer-aware asset cards;
3. a comparison workspace for multiple representations;
4. a data-quality and provenance panel;
5. a neutral next-action area for market context, read-only quote and wallet exposure;
6. a clearly separated preparation and execution boundary.

Each asset card should reserve space for verified underlying and issuer logos, but show an explicit unavailable state when the upstream metadata source does not provide them. No logo URL should be inferred from a ticker or scraped without provenance.

## Maturity and release gates

The current maturity boundary is:

- technical prototype: passed;
- local Agent integration: passed;
- local Hosted MCP proof of concept: passed;
- product expression: improving, not final;
- public package and Hosted MCP: not released;
- funded execution and post-trade verification: intentionally deferred;
- final competition materials: intentionally deferred.

The next product work should improve the shared evidence model, web presentation and documentation consistency before adding high-risk execution or public hosting.
