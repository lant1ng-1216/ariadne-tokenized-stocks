# Ariadne Product Requirements Document

## Product

Ariadne is an SDK and MCP server that gives existing AI agents a safe, structured way to understand and operate tokenized assets. It is not an autonomous trading agent and does not hold private keys.

## Problem

Tokenized equities may have multiple wrappers for the same underlying asset, different market states, different execution modes and different settlement requirements. A general-purpose Agent can call APIs, but it needs a reliable semantic and safety layer to avoid confusing contracts, misreading prices, skipping approvals or replaying uncertain transactions.

## Target users

1. Developers building wallets, trading interfaces and financial Agents.
2. Institutions that need permissions, approvals, simulation and auditability around Agent actions.
3. End users who access the capability indirectly through Codex, Claude Code, wallets or other Agent clients.

## Core capabilities

- Platform-aware asset resolution.
- Market and reference-price context.
- Quote comparison and execution-mode detection.
- ActionPlan creation with expiry, safety checks and simulation.
- External-wallet signing boundaries for RFQ and EVM transactions.
- Transaction and order status tracking.
- Explicit error, retry and rate-limit semantics.
- MCP tools and a reusable TypeScript SDK.

## Non-goals

- Holding private keys.
- Generating user wallet signatures.
- Making investment recommendations.
- Automatically broadcasting trades without explicit confirmation.
- Pretending that an upstream API failure is an empty result.

## Product principles

- Preserve asset identity at every step.
- Make uncertainty visible.
- Separate preparation, signing and broadcast.
- Prefer safe failure to ambiguous success.
- Make every high-risk action inspectable and reproducible.

## Roadmap

### Current

SDK, MCP server, RWA discovery, market context, quotes, ActionPlans, simulation, safety checks, retry policy and external signing boundaries.

### Next

Broader RWA adapters, hosted MCP/API, richer task-level tools, permissions, audit logs, monitoring and recovery workflows.

### Deferred validation

Funded RFQ settlement, successful broadcast and post-trade balance verification will be tested only with an explicitly controlled external wallet.
