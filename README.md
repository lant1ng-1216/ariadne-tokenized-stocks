# Ariadne

Tokenized Stocks SDK + MCP for BSC.

Ariadne is not another trading agent. It is a semantic and safety layer that lets existing agents and applications understand, compare, plan and simulate tokenized-stock actions through a reusable SDK and MCP server.

## What it does

- Resolves tokenized-stock identity by chain, contract, platform and underlying ticker;
- Compares tokenized-stock wrappers such as Ondo and bStocks;
- Returns market context with token price, reference price, market status and data warnings;
- Creates platform-aware quotes and action plans;
- Simulates EVM transactions before any broadcast;
- Exposes high-level tools to existing MCP clients such as Codex and Claude Code, including read-only RFQ/order status and explicit signed-transaction boundaries.

## Safety boundary

The MVP separates planning from execution:

```text
resolve → understand → quote → plan → simulate → user confirmation → sign → broadcast
```

The normal MCP demo does not broadcast a transaction. `broadcast_confirmed_transaction` is an explicit opt-in boundary: it requires a `confirmed` ActionPlan and an externally signed raw transaction. Ariadne never receives or stores a private key. Do not call it during a demo unless you intentionally want to send a real transaction.

## Local setup

1. Copy the values into the `.env` file in the project root.
2. Optionally configure a network proxy if Binance Web3 API is not directly reachable:

```env
BINANCE_WEB3_PROXY_URL=
# Optional; used only for read-only ERC-20 allowance checks on BSC.
BINANCE_WEB3_EVM_RPC_URL=https://bsc-dataseed.binance.org
```

3. Install dependencies:

```bash
npm install
```

## Checks

```bash
npm run typecheck
npm run test:domain
npm run test:simulation
npm run test:mcp
npm run demo
```

`test:simulation` uses a no-funds test transaction and never broadcasts. `test:mcp` starts the MCP server, discovers its tools, searches NVDA on BSC and creates a non-executing action plan.

## MCP configuration

For a local MCP client, run:

```bash
npm run mcp
```

For Codex or Claude Code, copy `docs/mcp-config.example.json`, replace `cwd` with the absolute project path, and ensure the project-root `.env` contains the Binance Web3 credentials. The example contains no credentials.

Before submission, use [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) for the reviewer run path, no-funds Preview expectations, verification commands and limitations that must be disclosed.

The server currently exposes:

- `resolve_tokenized_stock`
- `get_stock_market_context`
- `compare_stock_wrappers`
- `get_wallet_stock_exposure`
- `simulate_stock_action`
- `simulate_stock_action_plan`
- `create_stock_action_plan`
- `confirm_stock_action_plan` (state transition only; never signs or broadcasts)
- `submit_signed_rfq_order` (requires an externally produced EIP-712 signature)
- `get_rfq_order_status` (read-only)
- `broadcast_confirmed_transaction` (real side effect; requires confirmed plan and external signature)
- `get_broadcast_order_status` (read-only)

## Repository map

- `src/binance-web3-client.ts` — signed Binance Web3 API client;
- `src/domain/` — stable domain models, normalizers and safety checks;
- `src/services/` — tokenized-stock and transaction services;
- `src/mcp/server.ts` — MCP adapter;
- `scripts/` — local tests and API probes;
- `docs/DEVELOPER_EXPERIENCE_LOG.md` — factual API development log;
- `docs/API_CAPABILITY_MATRIX.md` — verified API capability matrix;
- `PRD.md` — product requirements document.
