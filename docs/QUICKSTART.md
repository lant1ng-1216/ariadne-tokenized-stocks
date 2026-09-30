# Ariadne Quickstart

## Demo Mode — no API credentials

Demo Mode provides deterministic, read-only tokenized-equity exploration so a user can test the AI-native interaction without Binance credentials or wallet funds.

```bash
npm install
npm run mcp:demo
```

Configure the MCP client to launch `npm run mcp:demo` with the repository as its working directory. No Binance account, API key or wallet is needed for this first run.

You can print a client-ready configuration for the current directory with:

```bash
npm run mcp:config:demo
```

For Live Mode, use `npm run mcp:config:live` after creating `.env` from `.env.example` and adding your own credentials.

Then ask in natural language:

```text
I want to understand the tokenized NVIDIA stock versions on BNB Chain. Compare them and show the warnings. Do not create a transaction.
```

In an MCP Agent client with automatic tool selection enabled, ask the question in natural language and the host may select `research_tokenized_stock`. This tool combines discovery, issuer comparison, market context, data-quality warnings and the next safe action in one read-only workflow. This repository's integration test explicitly invokes that tool with a natural-language query; it verifies Ariadne's handling and response, not automatic tool selection across every third-party Agent host. Lower-level tools remain available for developers who need explicit control.

Research results keep issuer/chain/contract identity intact and report the Binance Web3 source endpoint and provider update time for timestamped prices. Unknown status, missing liquidity, and other gaps are warnings—not zero values or assurances that a snapshot is fresh under a guaranteed SLA.

Useful first-run prompts:

```text
Show me every BSC tokenized representation of NVIDIA, compare issuers and price gaps, and explain which data is missing. Do not trade.

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
npm install
```

Set the user's own Binance Web3 API credentials in `.env`, then configure the MCP client using `docs/mcp-config.example.json`. Real signing and broadcasting remain separate user-wallet operations.

In Live Mode, use the same natural-language prompts in a host that supports MCP tool selection. Whether the host selects the appropriate tool automatically depends on that host and its configuration; the user can also invoke the research tool explicitly. Any quote, signature, transaction or broadcast remains an explicit later boundary.

For the controlled browser surface in Live Mode:

```bash
npm run web:live
```

This starts the Next.js site and a separate local API process. Binance credentials remain server-side; only GET-based catalog discovery, asset research, public-address exposure and read-only quote preview are exposed. Live Mode loads the current catalog returned by the BSC RWA API, including supplied token and issuer metadata. It is not a public deployment.
