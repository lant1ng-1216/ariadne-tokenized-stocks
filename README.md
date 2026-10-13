<div align="center">
  <img src="website/public/brand/ariadne.webp" width="88" alt="Ariadne logo" />

# Ariadne

### Tokenized stocks, with the issuer kept in view.

Research BNB Chain stock representations, compare the context, and prepare a purchase for **your** review.

[Website](https://ariadne-taupe.vercel.app) · [Remote MCP guide](docs/REMOTE_MCP_USAGE.md) · [Local MCP guide](docs/MCP_USAGE.md) · [SDK guide](docs/SDK_USAGE.md) · [Quickstart](docs/QUICKSTART.md)

![Node.js >=22.19](https://img.shields.io/badge/Node.js-%3E%3D22.19-252527?style=flat-square) ![MCP](https://img.shields.io/badge/MCP-remote%20%2B%20stdio-EB572F?style=flat-square) ![SDK](https://img.shields.io/badge/SDK-TypeScript-252527?style=flat-square) [![MIT](https://img.shields.io/badge/License-MIT-EB572F?style=flat-square)](LICENSE)
</div>

---

## Choose your path

| You want to… | Use | What you provide |
| --- | --- | --- |
| Talk to Ariadne from an agent client | **Hosted remote MCP** | An OAuth-capable Streamable HTTP MCP client and your own sign-in |
| Run Ariadne inside a local agent host | [Local stdio MCP](docs/MCP_USAGE.md) | Node.js and, for Live data, your own Binance Web3 API key and secret |
| Integrate stock research into an app | [TypeScript SDK](docs/SDK_USAGE.md) | Node.js, server-side Binance Web3 credentials and application code |

> [!IMPORTANT]
> The hosted service is **Live**, not the synthetic Demo mode. Users of the hosted service do **not** install the MCP npm package or provide a Binance API key. The local MCP package and SDK use a different credential boundary.

## Connect the hosted MCP — step by step

**Requirements:** an MCP client with **Streamable HTTP** transport and **OAuth** sign-in. A local-command / stdio-only client cannot connect to this URL.

1. Open your client's **MCP server settings**. Choose **Add remote server**, **HTTP server**, or the equivalent remote option. Do not choose a local command, executable, or stdio option.
2. Enter the display name `ariadne-tokenized-stocks`. Select **Streamable HTTP** and paste this exact URL:

   ```text
   https://ariadne-remote-mcp.vercel.app/api/mcp
   ```

3. Save or connect. Let your MCP client open the browser login. Sign in with **your own account**, review the Ariadne authorization screen, and approve only if you agree to connect this client.
4. Return to the MCP client. Confirm the server is **enabled for this conversation** and its Ariadne tools are visible. If the tool list is empty, refresh the connection or start a new conversation after authorization.
5. Send a read-only request:

   > Using the connected ariadne-tokenized-stocks server, show the BSC tokenized stock representations returned for NVDA. Compare the issuers, explain the coverage limits, and keep this read-only.

6. Open the client's **tool activity** and confirm an Ariadne tool was called. An answer based only on model knowledge or web search is not evidence that MCP connected.

**What you should see:** issuer-aware BSC results from the provider, along with data warnings. A client with MCP Apps support may also render native Ariadne views; other clients can read the text/structured tool output. The endpoint is an MCP transport URL, so visiting it in a normal browser tab is not a tool test. Client menu labels vary; [the full remote guide](docs/REMOTE_MCP_USAGE.md) describes connection checks and limitations.

### What the hosted connection has actually established

OAuth, tool discovery, Live catalog/research, and a **non-broadcast** purchase-intent review link have been observed. That does **not** establish a working wallet-bound quote, signature, broadcast, or settlement in the clean remote user journey. A MetaMask risk warning was observed; do not bypass a wallet warning for a demonstration. Ariadne never requests your private key. Read [current product limits](docs/PRODUCT_LIMITATIONS.md) before representing a prepared action as a trade.

## Local MCP package

The public [`ariadne-tokenized-stocks-mcp@0.1.0`](https://www.npmjs.com/package/ariadne-tokenized-stocks-mcp) is the **full local stdio MCP server**. It is not a Demo-only package. Node.js `>=22.19.0` is required.

For **Live** calls, configure your host's MCP child process with `ARIADNE_MODE=live`, `BINANCE_WEB3_API_KEY`, and `BINANCE_WEB3_API_SECRET`. Only set `BINANCE_WEB3_PROXY_URL` if your network needs a proxy. The package does not automatically load this repository's `.env`. Keep real credentials in your host's private environment configuration, not in source control. [Copy the full Live configuration template](docs/MCP_USAGE.md#live-mode-with-the-published-package).

For a credential-free **synthetic** preview, use `ARIADNE_MODE=demo` with the same package. Demo fixtures do not establish Live behavior. A local browser wallet handoff additionally needs a configured relay; [the local guide](docs/MCP_USAGE.md) explains that boundary.

## TypeScript SDK

The [`ariadne-tokenized-stocks@0.1.0`](https://www.npmjs.com/package/ariadne-tokenized-stocks) ESM package runs in your Node.js application (`>=22.19.0`):

```bash
npm install ariadne-tokenized-stocks@0.1.0
```

```ts
import { BinanceWeb3Client, TokenizedStocksService } from "ariadne-tokenized-stocks";

const client = new BinanceWeb3Client({
  apiKey: process.env.BINANCE_WEB3_API_KEY!,
  apiSecret: process.env.BINANCE_WEB3_API_SECRET!,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL || undefined, // optional
});
const stocks = new TokenizedStocksService(client);
const assets = await stocks.search("NVDA", { chainId: "56" });
```

Keep credentials server-side. The SDK does not load `.env` by itself; your application must supply these values. Inspect returned issuer and contract identity before preparing an action. [SDK setup, imports and execution boundaries](docs/SDK_USAGE.md) have the complete path.

## How Ariadne thinks about an asset

```text
Company / ticker → issuer-specific representation → market context
                 → user-reviewed intent → wallet decision → reconciliation
```

A matching ticker is not a matching token. Ariadne carries issuer, contract, chain and provenance through research. Results describe the provider's current returned set, not a guaranteed complete catalog. The agent can prepare context; **the person controls wallet access and any transaction**.

## Explore the source

| Directory | What it contains |
| --- | --- |
| [`src/`](src/) | SDK, domain model and local MCP implementation |
| [`remote-mcp/`](remote-mcp/) | Hosted MCP, OAuth and wallet-review app |
| [`website/`](website/) | Next.js product and developer site |
| [`examples/`](examples/) | SDK consumer example |
| [`docs/`](docs/) | Quickstarts, detailed setup, boundaries and reports |
| [`scripts/`](scripts/) | Build and verification scripts |

The website and hosted MCP are separate deployments. The hosted service source stays public for reproducibility. Internal research and deployment records are kept separately.

**Read next:** [Quickstart](docs/QUICKSTART.md) · [Remote MCP](docs/REMOTE_MCP_USAGE.md) · [Local MCP](docs/MCP_USAGE.md) · [SDK](docs/SDK_USAGE.md) · [API configuration](API_CONFIGURATION.md) · [Developer experience report](docs/DEVELOPER_EXPERIENCE_REPORT.md) · [Third-party notices](docs/THIRD_PARTY_NOTICES.md)

Licensed under [MIT](LICENSE).
