# Ariadne Quickstart

This guide assumes Node.js `>=22.19.0` and a local Ariadne source checkout. If you have not cloned the repository yet:

```bash
git clone https://github.com/lant1ng-1216/ariadne-tokenized-stocks.git
cd ariadne-tokenized-stocks
npm ci
```

There are two core ways to use Ariadne: connect its MCP server to an existing Agent, or consume the TypeScript SDK directly from your own Node.js application. This page starts with the Agent path; the [standalone SDK installation and usage guide](SDK_USAGE.md) covers the independent developer path.

## Demo Mode — no API credentials

Demo Mode provides deterministic, read-only tokenized-equity exploration so a user can test the AI-native interaction without Binance credentials or wallet funds.

```bash
npm run mcp:config:demo
```

Paste the generated JSON into your MCP client's server configuration. The client will launch `npm run mcp:demo` with the repository as its working directory. No Binance account, API key or wallet is needed for this first run.

The generated JSON contains the current absolute working directory. Do not copy the credentialed Live Mode example for this Demo setup.

For Live Mode, use `npm run mcp:config:live` after creating `.env` from `.env.example` and adding your own credentials.

Then ask in natural language:

```text
I want to understand the tokenized NVIDIA stock versions on BNB Chain. Compare them and show the warnings. Do not create a transaction.
```

If your MCP Agent client supports automatic tool selection, ask the question in natural language and the host may select `research_tokenized_stock`. If it does not, invoke that tool explicitly. This tool combines discovery, issuer comparison, market context, data-quality warnings and the next safe action in one read-only workflow. This repository's integration test explicitly invokes that tool with a natural-language query; it verifies Ariadne's handling and response, not automatic tool selection across every third-party Agent host. Lower-level tools remain available for developers who need explicit control.

Research results keep issuer/chain/contract identity intact and report the Binance Web3 source endpoint and provider update time for timestamped prices. Provider timestamps alone do not guarantee data freshness; the SDK/MCP response calls out that no market-data freshness SLA has been verified. Unknown status, missing liquidity, and other gaps are warnings—not zero values.

Search and directory results describe the matches returned by the upstream API; they are not a verified complete universe. A bounded read-only sample on 2026-10-03 found that platform metadata declared 545 BSC token records while the token-list endpoint returned 488 unique representations, a 57-record difference whose cause is unresolved. The provider contract exposed no verified pagination or total-count semantics, so do not present either number as a complete-market count. Demo Mode is a limited synthetic sample as well.

Useful first-run prompts:

```text
Show me the BSC tokenized NVIDIA representations returned by the provider, compare issuers and price gaps, and explain which data is missing. Do not trade.

Find tokenized NVIDIA stock on BSC. Give me the contract, issuer, token price, reference price, market status and risks. Do not create a plan.
```

Demo Mode never creates an executable action plan, signs, broadcasts or represents deterministic data as live market data.

## Direct web Demo Mode

If you want to inspect the product without asking Codex or Claude Code to render a second summary, start the local web surface:

```bash
npm run web:demo
```

Open `http://127.0.0.1:3000`. The Next.js App Router provides the multi-page product: SDK and MCP explanations, a deterministic asset directory, issuer comparison, field-level evidence, a public-address wallet-exposure preview and explicit-issuer read-only quote preview. No private key, seed phrase, ActionPlan, signature or broadcast is accepted by this surface.

## Live Mode

For live read-only data and quote preparation:

```bash
cp .env.example .env
```

Set your own Binance Web3 API credentials in `.env`, then run `npm run mcp:config:live` and copy its output into your MCP client's server configuration. Keep `.env` local; do not commit credentials. Real signing and broadcasting remain separate user-wallet operations.

In Live Mode, use the same natural-language prompts in a host that supports MCP tool selection. Whether the host selects the appropriate tool automatically depends on that host and its configuration; the user can also invoke the research tool explicitly. Any quote, signature, transaction or broadcast remains an explicit later boundary.

For the controlled browser surface in Live Mode:

```bash
npm run web:live
```

This starts the Next.js site and a separate local API process. Binance credentials remain server-side; only GET-based catalog discovery, asset research, public-address exposure and read-only quote preview are exposed. Live Mode loads the current catalog returned by the BSC RWA API, including supplied token and issuer metadata. It is not a public deployment.
