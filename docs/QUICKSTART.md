# Ariadne Quickstart

This guide assumes Node.js `>=22.19.0`. During local development, prepare the repository with:

```bash
git clone https://github.com/lant1ng-1216/ariadne-tokenized-stocks.git
cd ariadne-tokenized-stocks
npm ci
```

There are two core ways to use Ariadne: connect its MCP server to an existing Agent, or consume the TypeScript SDK directly from your own Node.js application. This page starts with the Agent path; the [standalone SDK installation and usage guide](SDK_USAGE.md) covers the independent developer path.

For the independently packaged local MCP executable, follow the [MCP package guide](MCP_USAGE.md). It is the recommended competition path and does not require the Agent host to run from a source checkout.

## Demo Mode — no API credentials

Demo Mode provides deterministic, read-only tokenized-equity exploration so a user can test the AI-native interaction without Binance credentials or wallet funds.

```json
{
  "mcpServers": {
    "ariadne-tokenized-stocks": {
      "command": "npx",
      "args": ["-y", "ariadne-tokenized-stocks-mcp@0.1.0"],
      "env": { "ARIADNE_MODE": "demo" }
    }
  }
}
```

Paste the JSON into your MCP client's server configuration and reload the host. `npx` launches the published local stdio MCP package. No Binance account, API key or wallet is needed for this first run.

From a source checkout, `npm run mcp:config:demo` remains an equivalent fallback; its generated JSON contains the current absolute working directory.

For Live Mode, use `npm run mcp:config:live` after creating `.env` from `.env.example` and adding your own credentials. This generated command is for the source checkout; the public `npx` package needs its environment passed by the MCP host. See [MCP Package Usage](MCP_USAGE.md) for both configurations.

Then ask in natural language:

```text
I want to understand the tokenized NVIDIA stock versions on BNB Chain. Compare them and show the warnings. Do not create a transaction.
```

If you have not selected a company or ticker, ask broadly about the BSC market and the host can select `browse_tokenized_stock_catalog`. It returns the current Binance Web3 catalog scope, issuer and asset-type distribution, dual-issuer candidates and a bounded page of underlyings. After selecting a stock, the host can select `research_tokenized_stock` for issuer comparison, market context, data-quality warnings and the next safe action. The capability descriptions use conversation stage and meaning; Ariadne does not map example phrases to tools with fixed keyword rules. Automatic selection still depends on the Agent host, and either tool can be invoked explicitly.

Research results keep issuer/chain/contract identity intact and report the Binance Web3 source endpoint and provider update time for timestamped prices. Provider timestamps alone do not guarantee data freshness; the SDK/MCP response calls out that no market-data freshness SLA has been verified. Unknown status categories, missing liquidity, and other gaps remain visible rather than being filled with guessed values. When Binance explicitly reports `openState: true`, that separate field confirms the provider's current tradability signal without changing the category from Unknown.

Search and directory results describe the matches returned by the upstream API; they are not a verified complete universe. A bounded read-only sample on 2026-10-03 found that platform metadata declared 545 BSC token records while the token-list endpoint returned 488 unique representations, a 57-record difference whose cause is unresolved. The provider contract exposed no verified pagination or total-count semantics, so do not present either number as a complete-market count. Demo Mode is a limited synthetic sample as well.

Useful first-run prompts:

```text
Show me the BSC tokenized NVIDIA representations returned by the provider, compare issuers and price gaps, and explain which data is missing. Do not trade.

Find tokenized NVIDIA stock on BSC. Give me the contract, issuer, token price, reference price, market status and risks. Do not create a plan.
```

Demo Mode never creates an executable action plan, signs, broadcasts or represents deterministic data as live market data.

## Live Mode

For live read-only data and quote preparation:

```bash
cp .env.example .env
# Add the two Binance Web3 credentials to .env; set the proxy only if your network requires one.
npm run mcp:config:live
```

Run these commands from a source checkout after `npm ci`. Set `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_API_SECRET` in the local `.env`; `BINANCE_WEB3_BASE_URL` defaults to `https://web3.binance.com/build`, and `BINANCE_WEB3_PROXY_URL` is optional. `npm run mcp:config:live` prints a stdio configuration using Node's `--env-file=.env`, so the MCP child process reads those local values. For the published `npx` package, configure the child-process environment in your MCP host as described in [MCP Package Usage](MCP_USAGE.md). The MCP package defaults to Live when `ARIADNE_MODE` is omitted, but setting it explicitly to `live` makes the intended mode clear. Keep credentials local and never commit them. Read-only research does not require a wallet or relay. Creating a browser purchase handoff additionally requires a ready relay; see [API Configuration](../API_CONFIGURATION.md) and [Wallet Host Bridge](ARIADNE_WALLET_HOST_BRIDGE.md). Real signing and broadcasting remain separate user-wallet operations.

In Live Mode, use the same natural-language prompts in a host that supports MCP tool selection. Whether the host selects the appropriate catalog or research capability automatically depends on that host and its configuration. The server may expose dedicated MCP App catalog and research panels; other hosts can display the same results as structured content and text. Any purchase plan, signature, transaction or broadcast remains an explicit later boundary.

To use the SDK without an Agent host, follow the [standalone SDK guide](SDK_USAGE.md). It documents local package building and a clean-room consumer check.

The deployed Remote MCP transport is experimental and is not the recommended Live evaluation path: the verified Vercel and Cloudflare cloud-egress paths returned Binance compliance code `40304`. Remote MCP Live remains a roadmap item; the local stdio package is the supported submission path.
