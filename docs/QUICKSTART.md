# Quickstart

Ariadne has three developer paths. Start with the hosted remote MCP if your agent client supports Streamable HTTP and OAuth; choose local stdio MCP when you need a local process; use the SDK when you are writing a Node.js application.

## 1. Remote MCP (recommended for an agent)

Add a **remote/HTTP MCP server** in your client:

- Name: `ariadne-tokenized-stocks` (or another name you recognize)
- Transport: Streamable HTTP
- URL: `https://ariadne-remote-mcp.vercel.app/api/mcp`
- Authentication: complete the browser sign-in and consent opened by your client

You do not need the MCP npm package, Binance API credentials, a local proxy, or a local relay for hosted research. The server uses Live data. If your host does not support OAuth for remote MCP, use the local option below. Host menus and configuration syntax differ; do not paste the stdio `npx` JSON into a remote-server field.

After connecting, ask: “Use the connected Ariadne server to show the BSC tokenized-stock representations returned for NVDA, compare the issuers and explain missing market data. Keep this read-only.” Confirm the host actually called Ariadne tools; a model's general-knowledge answer is not a successful MCP call. Catalog coverage is limited to the upstream results and is not a complete-market guarantee.

The hosted flow has verified Live catalog and research calls and a non-broadcast purchase-intent review link. MCP App visuals require host support. Wallet connection and final funded settlement remain unverified in a clean remote user journey; a MetaMask risk warning has been observed. See [Remote MCP usage and status](REMOTE_MCP_USAGE.md).

## 2. Local MCP package

The same full stdio package can run Live with your own Binance Web3 credentials or use an explicitly synthetic Demo mode. Install Node.js `>=22.19.0` and configure your MCP host to run `npx -y ariadne-tokenized-stocks-mcp@0.1.0`. For Live, inject `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_API_SECRET` into that child process; `BINANCE_WEB3_PROXY_URL` is optional. The package does not read a repository `.env` automatically. [Exact local configuration](MCP_USAGE.md).

For a credential-free, read-only fixture preview only, set `ARIADNE_MODE=demo`. Demo responses are not Live market results.

## 3. TypeScript SDK

```bash
npm install ariadne-tokenized-stocks@0.1.0
```

The SDK runs inside your Node.js application, using your own Binance Web3 API key and secret server-side. Follow the [SDK guide](SDK_USAGE.md) to import the client, search assets, select a specific issuer/contract, inspect market context and prepare a guarded action. SDK usage does not require an MCP client.

## Action boundary

Ariadne can prepare context and a reviewable purchase intent. The agent host decides when to use a tool, and the owner decides whether to connect a wallet and approve a transaction. The remote service must not be assumed to have completed a wallet-bound quote, signature, broadcast, or final settlement because a review link was created.
