# MCP Package Usage

Ariadne's `ariadne-tokenized-stocks-mcp` package is the full stdio MCP server for compatible local Agent hosts. It is separate from the TypeScript SDK and does not require application code to import Ariadne classes. The same published package supports Live provider calls and the optional `ARIADNE_MODE=demo` fixture mode; it is not a Demo-only build. The MCP server requires Node.js `>=22.19.0` and a host that can launch a local stdio MCP process.

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

### Live mode with the published package

Use the same public package, explicitly select Live mode, and provide the Binance Web3 credentials to the MCP child process:

```json
{
  "mcpServers": {
    "ariadne-tokenized-stocks": {
      "command": "npx",
      "args": ["-y", "ariadne-tokenized-stocks-mcp@0.1.0"],
      "env": {
        "ARIADNE_MODE": "live",
        "BINANCE_WEB3_API_KEY": "<your API key>",
        "BINANCE_WEB3_API_SECRET": "<your API secret>"
      }
    }
  }
}
```

Replace both placeholders locally. Treat this as a configuration template, not a file to commit or share; use the MCP host's private secret/environment facility where available. Secret interpolation syntax is host-specific and is not performed by Ariadne. The published `npx` process receives only the environment the host passes to it; it does not load the repository's `.env` file. If your host cannot inject local secrets safely, use the source-checkout configuration below, which runs Node with `--env-file=.env`.

`BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_API_SECRET` are required for Live mode. `BINANCE_WEB3_BASE_URL` is optional (default `https://web3.binance.com/build`). `BINANCE_WEB3_PROXY_URL` is optional and is passed to the client's `proxyUrl` setting when your network requires an HTTP proxy. `HTTPS_PROXY` is not read automatically. Keep these values in the MCP child-process environment, not in source control.

### Source-checkout configuration

From a clone of this repository, run `npm ci`, create a local `.env` from `.env.example`, and set the two Binance credentials there. Then run `npm run mcp:config:live`. The generated configuration uses the checkout's absolute path and `node --env-file=.env --import tsx src/mcp/server.ts`; it is not a portable configuration for another machine. `npm run mcp:config:demo` prints the corresponding credential-free fixture configuration.

Read-only catalog, research and comparison do not require a wallet-handoff relay. Creating an external browser purchase-intent link does require `ARIADNE_WALLET_HANDOFF_RELAY_URL` and `ARIADNE_WALLET_HANDOFF_RELAY_SECRET` on the MCP process and a ready local loopback or HTTPS relay. For local loopback use, Ariadne can start an embedded relay; for a hosted relay, the separate relay process must be reachable over HTTPS and use the matching secret. `ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN` and the private store-path setting belong to the relay process. Follow [API Configuration](../API_CONFIGURATION.md) and [Wallet Host Bridge](ARIADNE_WALLET_HOST_BRIDGE.md); do not put the relay secret in a page, URL, browser bundle, prompt, or public repository.

The package uses stdio and therefore inherits the Agent host's process lifecycle. A compatible host can list and call the same Ariadne tools, but tool selection, MCP App rendering, external-link behavior, wallet popup behavior and automatic conversation follow-up remain host capabilities. The package does not claim identical UI behavior across every MCP host.

The source package can be verified before publication with `npm run test:mcp-package`. That deterministic packaging check stages and packs the MCP distribution, installs it in a disposable consumer, launches `ariadne-mcp` in Demo mode, lists tools and completes a read-only research call. It does not call Binance or a wallet and is not Live MCP acceptance evidence.

For the experimental remotely hosted Streamable HTTP service, use the separate [Remote MCP Deployment](REMOTE_MCP_DEPLOYMENT.md) guide. Remote delivery adds authentication, origin controls, bounded sessions, health/readiness checks and a container artifact; it is not the same process contract as local stdio. Binance Web3 currently rejects the verified Vercel and Cloudflare cloud-egress paths with compliance code `40304`, so Remote Live access remains a product-roadmap item and must not be presented as the stable evaluation route.
