# Ariadne

## AI-native interaction infrastructure for onchain finance

Ariadne gives developers and existing AI Agents one coherent way to discover, understand, compare and act on tokenized equities and real-world assets. Its TypeScript SDK and MCP server turn fragmented onchain data and execution modules into issuer-aware financial objects, research evidence and reviewable action states on BNB Chain.

**Make onchain markets intelligible and actionable for AI.**

Ariadne works with existing Agents rather than replacing them. Safety checks, simulation and externally controlled signing are foundations of the interaction model, not the product's headline identity.

## Why Ariadne exists

Tokenized stocks are not a single uniform asset namespace. The same underlying ticker can be represented by different platforms, contracts, symbols, pricing references and execution modes. An agent that sees only a ticker is not ready to construct a safe action.

```text
resolve identity → compare wrappers → read market context → build plan
→ simulate → confirm → external wallet signature → broadcast
```

The SDK keeps discovery and execution separate. The MCP layer exposes the same domain model to existing clients such as Codex and Claude Code.

The product is organized as an AI-native interaction core: users express intent, while Ariadne resolves issuer-aware assets, organizes market context, compares representations and prepares reviewable next steps.

## Product interfaces

Ariadne has one shared domain and safety core with two ways to integrate it:

- the TypeScript SDK for developers building their own applications and agent workflows;
- the MCP server for users and developers working through compatible Agent hosts such as Codex and Claude Code.

The MCP server can also expose an MCP App research card in hosts that support the UI extension. That card is part of the MCP interaction, not a separate Ariadne website. This repository contains the SDK/MCP product, its tests and examples, and the technical research needed to understand the implementation and its evidence boundaries.

## System boundary

```mermaid
flowchart LR
    A[Existing Agent] --> B[Ariadne MCP]
    B --> C[Ariadne SDK]
    C --> D[Normalization and safety policy]
    D --> E[Binance Web3 API]
    C --> F[External wallet signer]
    F --> G[Signed order or transaction]
    G --> E
```

The SDK never receives or stores a private key. RFQ signing and broadcast authorization remain explicit user-wallet responsibilities.

## Verified project snapshot

The current evidence package contains 105 audited request records, 40 result snapshots and 5 safety-result records. The audit passed with 105 unique record identifiers, no broadcasted records, no coverage gaps and no recorded failures.

![Observed latency distributions](research/figures/nature-sample/experiment-latency-ecdf.svg)

**Observed latency distributions.** Empirical cumulative distributions are shown for the audited development observations. The figure reports the full observed distribution rather than reducing performance to a single mean; it is not a production SLO claim.

![Observed response classifications](research/figures/nature-sample/experiment-handling-heatmap.svg)

**Observed response classifications.** The heatmap preserves the response classes actually recorded by the experiment harness across asset discovery, market context, quote preparation, safety reads, simulation, upstream error handling and retry behavior.

The complete evidence model, audit output and reproducible figure inputs are maintained under [`research/`](research/).

## Current capabilities

- Resolve tokenized-stock identity by ticker, chain, platform and contract.
- Discover and compare issuer-aware tokenized-stock representations through high-level Agent-native MCP tools.
- Prepare an ActionPlan from a user intent without silently selecting between multiple issuers.
- Screen assets by explicit preferences and summarize tokenized-stock wallet exposure without making investment recommendations.
- Compare wrappers such as Ondo and bStocks.
- Normalize token price, reference price, market state, candles and data warnings.
- Read wallet exposure, portfolio information and transaction context.
- Create and simulate ActionPlans before execution.
- Enforce allowance, market-state, slippage and verified-unit price-impact checks. ERC-20 plans without a quote-declared, verifiable spender fail closed; input-token/native BNB balances and allowance are rechecked before guarded BSC EVM broadcast. Funded settlement remains unverified.
- Offer `GuardedEvmExecutionService` for one standard BSC EVM action through the standalone SDK, accepting only the unchanged in-memory plan object issued by SDK preparation; it applies staged plan binding, external signature verification, reviewed gas limits, live balance and allowance checks, and one-attempt replay protection.
- Prepare RFQ signing requests without handling private keys.
- Expose 18 MCP tools for existing agents and applications, including the one-call `research_tokenized_stock` workflow.
- Return stable issuer-by-issuer evidence entries, explicit identity/market-data coverage and read-only next steps instead of relying on fragile Markdown tables.
- Report Ariadne workflow timing with an explicit boundary that excludes calling-Agent reasoning and final-answer rendering.
- Browse the verified BSC RWA directory with official token and issuer metadata, then move into issuer comparison, evidence inspection, public-address exposure or explicit-issuer quote preview.
- Record request attempts, latency, business codes and rate-limit headers.
- Retry documented transient failures while keeping broadcast operations explicit and non-automatic.

## MCP response contract

Every MCP tool returns its domain payload together with an `outcome` object:

```json
{
  "outcome": {
    "status": "success",
    "nextAction": "Review the simulation, then confirm the plan if appropriate",
    "warnings": [],
    "sideEffects": "none"
  }
}
```

`status` is one of `success`, `warning`, `blocked` or `error`. `nextAction` is an agent-readable continuation hint, while `sideEffects` makes external signing and broadcast boundaries explicit. Existing domain fields remain at the top level for compatibility.

## Safety model

```text
read → plan → simulate → confirm → sign externally → submit → poll status
```

The MCP `broadcast_confirmed_transaction` tool and SDK `GuardedEvmExecutionService.broadcastSigned()` are the guarded standard-EVM broadcast boundaries. Both require a confirmed, unchanged plan and an externally signed raw transaction. No private key handling is implemented in Ariadne. The generic callback `ExecutionService` and raw `TransactionService.broadcastSigned()` remain lower-level integrator-owned escape hatches; see [`docs/SDK_USAGE.md`](docs/SDK_USAGE.md).

## Quickstart

For the full prerequisites and setup steps, see [`docs/QUICKSTART.md`](docs/QUICKSTART.md). It separates the credential-free MCP Demo from Live Mode and links the [standalone SDK guide](docs/SDK_USAGE.md). With the repository installed, the quickest Agent path is:

```bash
npm ci
npm run mcp:config:demo
```

Demo Mode is deterministic and read-only. It does not create executable plans, sign or broadcast. Generate the matching client configuration with `npm run mcp:config:demo`; the generated JSON uses the current absolute repository path. Do not paste the Live Mode configuration into a Demo setup.

For offline local checks, run `npm run typecheck`, `npm run test:domain` and `npm run test:demo-mode`. Live API checks require your own credentials and are documented separately.

The no-funds simulation path does not broadcast a transaction. If the Agent host supports automatic tool selection, it may select `research_tokenized_stock` from a natural-language request; otherwise invoke that tool explicitly. Tool selection behavior depends on the host and is not guaranteed by Ariadne. MCP App rendering also depends on the host; the bundled native research view is verified locally, but its visual presentation can vary by client.

## Evidence and limitations

The complete evaluation protocol, observations, failure taxonomy and deferred tests are in [`docs/TECHNICAL_RESEARCH_REPORT.md`](docs/TECHNICAL_RESEARCH_REPORT.md). In particular:

- Real RFQ settlement requires an external wallet signature and remains deferred.
- Funded post-trade balance and successful broadcast validation remain deferred until a funded wallet is intentionally used.
- Three documented DeFi Positions request variants returned upstream business code `50000`; Ariadne records this as an upstream blocker rather than an empty result.
- The SDK package is not published to npm; the Hosted MCP implementation is a local proof of concept, not a production endpoint.
- Demo video and final submission material are intentionally outside the current implementation scope.

## Repository map

- `src/` — SDK domain, services and MCP adapter;
- `scripts/` — tests and API probes;
- `research/` — evidence data, experiment records and reproducible figure generation;
- [`docs/CAPABILITY_MAP_AGENT_NATIVE_RWA.md`](docs/CAPABILITY_MAP_AGENT_NATIVE_RWA.md) — capability and Track mapping;
- [`docs/TECHNICAL_RESEARCH_REPORT.md`](docs/TECHNICAL_RESEARCH_REPORT.md) — complete technical evaluation;
- [`docs/PRODUCT_SURFACE_ARCHITECTURE.md`](docs/PRODUCT_SURFACE_ARCHITECTURE.md) — SDK/MCP responsibilities and product boundaries;
- [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) — concise product-development history and verification record;
- [`docs/PRODUCT_EXPERIENCE_REPORT.md`](docs/PRODUCT_EXPERIENCE_REPORT.md) — Agent/MCP interaction observations and usability findings;
- [`docs/PRODUCT_LIMITATIONS.md`](docs/PRODUCT_LIMITATIONS.md) — known product and provider boundaries;
- [`docs/BINANCE_RWA_API_CONTRACT_AUDIT.md`](docs/BINANCE_RWA_API_CONTRACT_AUDIT.md) — official provider-contract review and bounded conclusions.
