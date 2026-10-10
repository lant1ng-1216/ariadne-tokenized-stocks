# MCP Package Usage

Ariadne's MCP package is a separate executable distribution for compatible local Agent hosts. It is not the SDK package and does not require application code to import Ariadne classes.

For a credential-free first run, configure a compatible MCP host to launch the public package with `npx`:

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

For source review or pre-publication verification, build and install the local tarball:

```bash
# In the Ariadne source checkout
npm ci
npm run pack:mcp

# In any local directory used to hold MCP executables
npm install /absolute/path/to/ariadne-tokenized-stocks-mcp-0.1.0.tgz
```

The installed executable is `ariadne-mcp`. Demo mode is credential-free, deterministic and read-only:

```json
{
  "mcpServers": {
    "ariadne-tokenized-stocks": {
      "command": "/absolute/path/to/node_modules/.bin/ariadne-mcp",
      "env": {
        "ARIADNE_MODE": "demo"
      }
    }
  }
}
```

For Live mode, omit `ARIADNE_MODE=demo` and pass `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_API_SECRET` through the host's environment or secret facility. Do not place credential values in a committed MCP configuration. Optional provider and wallet-handoff settings remain documented in [API Configuration](../API_CONFIGURATION.md) and [Wallet Host Bridge](ARIADNE_WALLET_HOST_BRIDGE.md).

The package uses stdio and therefore inherits the Agent host's process lifecycle. A compatible host can list and call the same Ariadne tools, but tool selection, MCP App rendering, external-link behavior, wallet popup behavior and automatic conversation follow-up remain host capabilities. The package does not claim identical UI behavior across every MCP host.

The package can be verified before publication with `npm run test:mcp-package`. That check stages and packs the MCP distribution, installs it in a disposable consumer, launches `ariadne-mcp` in Demo mode, lists tools and completes a read-only research call. It does not call Binance or a wallet.

For the experimental remotely hosted Streamable HTTP service, use the separate [Remote MCP Deployment](REMOTE_MCP_DEPLOYMENT.md) guide. Remote delivery adds authentication, origin controls, bounded sessions, health/readiness checks and a container artifact; it is not the same process contract as local stdio. Binance Web3 currently rejects the verified Vercel and Cloudflare cloud-egress paths with compliance code `40304`, so Remote Live access remains a product-roadmap item and must not be presented as the stable evaluation route.
