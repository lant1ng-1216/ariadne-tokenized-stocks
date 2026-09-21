# Ariadne Quickstart

## Demo Mode — no API credentials

Demo Mode provides deterministic, read-only NVDA exploration so a user can test the Agent-native interaction without Binance credentials or wallet funds.

```bash
npm install
npm run mcp:demo
```

Configure the MCP client to launch `npm run mcp:demo` with the repository as its working directory. No Binance account, API key or wallet is needed for this first run.

Then ask in natural language:

```text
I want to understand the tokenized NVIDIA stock versions on BNB Chain. Compare them and show the warnings. Do not create a transaction.
```

For the shortest Agent-native path, the client should select `research_tokenized_stock` automatically. It combines discovery, issuer comparison, market context, data-quality warnings and the next safe action in one read-only workflow. Lower-level tools remain available for developers who need explicit control.

Useful first-run prompts:

```text
Show me every BSC tokenized representation of NVIDIA, compare issuers and price gaps, and explain which data is missing. Do not trade.

Find tokenized NVIDIA stock on BSC. Give me the contract, issuer, token price, reference price, market status and risks. Do not create a plan.
```

Demo Mode never creates an executable action plan, signs, broadcasts or represents deterministic data as live market data.

## Live Mode

For live read-only data and quote preparation:

```bash
cp .env.example .env
npm install
```

Set the user's own Binance Web3 API credentials in `.env`, then configure the MCP client using `docs/mcp-config.example.json`. Real signing and broadcasting remain separate user-wallet operations.

In Live Mode, use the same natural-language prompts. Ariadne resolves the appropriate read-only workflow; a user does not need to name an MCP tool. Any quote, signature, transaction or broadcast remains an explicit later boundary.
