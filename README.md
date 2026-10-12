# Ariadne

**Issuer-aware tokenized-stock research and user-reviewed purchase preparation on BNB Chain.** Use Ariadne through a hosted MCP service, a local stdio MCP package, or a TypeScript SDK.

[Product website](https://ariadne-taupe.vercel.app) · [Remote MCP connection guide](docs/REMOTE_MCP_USAGE.md)

Ariadne keeps issuer, chain, contract and token identity attached to each provider-returned representation. Research results include provenance and warnings; an agent can prepare a purchase for review, but the user controls wallet access and any transaction.

## Connect to the remote MCP service

In an MCP client that supports **Streamable HTTP and OAuth**, add a remote server named `ariadne-tokenized-stocks` with this URL:

```text
https://ariadne-remote-mcp.vercel.app/api/mcp
```

Follow the client's sign-in and authorization flow. You do **not** need to install the MCP npm package, supply a Binance API key, or run a local relay to use this hosted service. The hosted service performs Live BSC research; it is not the synthetic Demo mode. Client menus and configuration formats vary, so choose the client's remote/HTTP MCP option rather than its local-command or stdio option.

Once connected, try: “Show me the BSC tokenized stocks currently returned for NVDA. Compare the issuers, explain the data limits, and keep this read-only.” If your client supports MCP Apps, it may show Ariadne's native views; other clients can use the structured/text tool results. The agent host still decides whether to invoke a tool, so inspect its tool activity when evaluating the connection.

The remote service has been verified for Live discovery, issuer-aware research and a **non-broadcast** purchase-intent review link. A user wallet connection, wallet-bound quote, signature, broadcast and final settlement have not been established as a generally working hosted flow. A MetaMask risk warning was observed during the clean-host wallet test; do not bypass a wallet warning to complete a demo. [Remote MCP usage and status](docs/REMOTE_MCP_USAGE.md) records the exact boundary.

## Use the local MCP package

The published `ariadne-tokenized-stocks-mcp` package is the full **local stdio** MCP server, with Live and optional Demo modes. It is useful if your client cannot connect to remote OAuth MCP or if you want to run the server yourself. It requires Node.js `>=22.19.0` and an MCP host that can launch a local process.

For a credential-free *synthetic Demo* only:

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

For **local Live** data, configure `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_API_SECRET` in the MCP child process. Set `BINANCE_WEB3_PROXY_URL` only if your network requires an HTTP proxy. Read-only research needs no wallet or relay. Creating a browser purchase handoff locally has additional relay configuration. The package does not automatically read this repository's `.env`; follow the [local MCP package guide](docs/MCP_USAGE.md) for exact setup and limits.

## Use the TypeScript SDK

In a Node.js application (Node.js `>=22.19.0`):

```bash
npm install ariadne-tokenized-stocks@0.1.0
```

The SDK makes authenticated Binance Web3 calls from your application. Supply your own Binance Web3 API key and secret server-side, explicitly select the issuer representation returned by research, then request market context or prepare a guarded action. The SDK has no hosted OAuth shortcut. See [SDK usage](docs/SDK_USAGE.md) for imports and the supported execution boundary.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/` | SDK, domain model and local MCP implementation |
| `remote-mcp/` | Hosted MCP, OAuth and wallet-review application |
| `website/` | Next.js product site |
| `examples/` | Standalone SDK example |
| `docs/` | Developer setup, API configuration and product limits |
| `scripts/` | Build and verification scripts |

The hosted service and website are separate deployments. The remote source must remain with the public project for reproducibility; moving it to an internal archive would break that relationship. Internal research artifacts are being reviewed separately from product code.

## Documentation

- [Quickstart](docs/QUICKSTART.md) — remote MCP first, then local MCP and SDK
- [Remote MCP usage and status](docs/REMOTE_MCP_USAGE.md) — connection, authentication, verified capabilities and limits
- [Local MCP package usage](docs/MCP_USAGE.md) — stdio Live and Demo configuration
- [SDK usage](docs/SDK_USAGE.md) — direct TypeScript integration
- [API configuration](API_CONFIGURATION.md) — local environment variables and relay prerequisites
- [Developer Experience Report](docs/DEVELOPER_EXPERIENCE_REPORT.md)
- [Product limitations](docs/PRODUCT_LIMITATIONS.md)
- [Third-party notices](docs/THIRD_PARTY_NOTICES.md)

## Development

```bash
npm ci
npm run typecheck
```

Some scripts contact Live provider endpoints; inspect their commands and provide credentials only when needed. Ariadne never asks for or stores a wallet private key. Source checks, fixture results and a historic BSC pilot do not prove that every issuer route or the current hosted wallet journey completes a funded transaction.

Licensed under [MIT](LICENSE).
