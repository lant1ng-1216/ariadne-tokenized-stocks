# Ariadne

**A TypeScript SDK and Model Context Protocol (MCP) server for issuer-aware research and guarded workflows for tokenized stocks and real-world assets on BNB Chain.**

Ariadne preserves the identity of each provider-returned representation—issuer, chain, contract, and token symbol—while exposing market context, data provenance, warnings, and explicit action boundaries. It integrates with existing MCP-capable Agent hosts or can be used directly from a Node.js application through the SDK.

The MCP server supports credential-free Demo configuration and authenticated Live configuration; the SDK can be integrated independently.

## Requirements

- Node.js `>=22.19.0`
- npm
- For Live API calls: Binance Web3 API key and secret, supplied to the local MCP process or Node.js application
- For purchase-plan browser handoff: a configured, reachable Ariadne wallet-handoff relay; read-only research does not require it
- A wallet is needed only if a user chooses to continue through the wallet-confirmation flow; Ariadne never stores private keys

## Try the MCP package (Demo quick start)

The published `ariadne-tokenized-stocks-mcp` package is the full local stdio MCP server. It supports both Live provider calls and a credential-free Demo mode; this first-run example explicitly selects Demo mode and uses a limited synthetic sample. The local stdio package is the recommended competition path because it runs on the evaluator's machine and avoids the observed cloud-egress limitation of the experimental Remote MCP deployment.

Add this configuration to your MCP host:

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

Demo Mode is deterministic, read-only, and credential-free. It is only a quick product walkthrough; it is not Live market data and is not evidence that provider calls work. Restart or reload the MCP host after saving the configuration, then ask it to browse BSC tokenized stocks or compare issuer representations. For Live package setup, including safe credential and optional proxy configuration, follow [MCP Package Usage](docs/MCP_USAGE.md).

### Source-checkout fallback

```bash
git clone https://github.com/lant1ng-1216/ariadne-tokenized-stocks.git
cd ariadne-tokenized-stocks
npm ci
npm run mcp:config:demo
```

Add the generated configuration to an MCP-capable Agent host. The command uses the current local checkout path and needs no Binance credentials or wallet.

For an undecided user, try browsing the BSC catalog first. After choosing a company, ask the Agent to research or compare its returned issuer representations. Host-side tool selection depends on the Agent; tools can also be invoked explicitly.

## Live MCP configuration

```bash
cp .env.example .env
# Set BINANCE_WEB3_API_KEY and BINANCE_WEB3_API_SECRET in the local .env file.
# Set BINANCE_WEB3_PROXY_URL only if this network requires an HTTP proxy.
npm run mcp:config:live
```

Run this from a source checkout after `npm ci`. The generated MCP configuration uses the checkout's `.env` through Node's `--env-file` option and embeds the current checkout path. Keep `.env` local and never commit credential values. The Live stdio package requires the two Binance variables; the proxy is optional and is passed as `proxyUrl` when configured. Read-only research needs no relay or wallet. Creating a browser purchase handoff additionally requires the relay variables documented in [API Configuration](API_CONFIGURATION.md) and [Wallet Host Bridge](docs/ARIADNE_WALLET_HOST_BRIDGE.md), followed by explicit user review and wallet confirmation.

## TypeScript SDK

Install the standalone SDK in a Node.js application:

```bash
npm install ariadne-tokenized-stocks@0.1.0
```

See [SDK usage](docs/SDK_USAGE.md) for imports, explicit issuer selection, data provenance, ActionPlan preparation, and the guarded BSC EVM execution boundary. A source-checkout tarball workflow remains documented for offline review and release verification.

## Documentation

- [Quickstart](docs/QUICKSTART.md) — Demo and Live MCP setup
- [MCP package usage](docs/MCP_USAGE.md) — public stdio package, Live environment, relay prerequisites, and host boundaries
- [SDK usage](docs/SDK_USAGE.md) — standalone SDK integration and execution boundary
- [API configuration](API_CONFIGURATION.md) — environment-variable meanings and where each one is required
- [Developer Experience Report](docs/DEVELOPER_EXPERIENCE_REPORT.md) — English, evidence-based evaluation of onboarding, documentation, API behavior, Agent integration, market observations, and engineering recommendations
- [Product limitations](docs/PRODUCT_LIMITATIONS.md) — provider, host, route, distribution, and evidence boundaries
- [Product architecture](docs/PRODUCT_SURFACE_ARCHITECTURE.md) — SDK, MCP, Agent, and wallet responsibilities
- [API capability matrix](docs/API_CAPABILITY_MATRIX.md) — mapped API and product capabilities
- [Third-party notices](docs/THIRD_PARTY_NOTICES.md) — dependency and license notices
- [Remote MCP deployment](docs/REMOTE_MCP_DEPLOYMENT.md) — experimental HTTP delivery and the current cloud Live-data limitation

## Development checks

```bash
npm run typecheck
npm run test:domain
npm run test:demo-mode
npm run test:repository-scope
npm run audit:experiments
```

Some Live checks require credentials and contact Binance Web3 read or quote endpoints. Consult each command's script before running it.

## Project boundary

Ariadne is an integration layer, not an autonomous Agent or wallet. The Agent host interprets natural language and chooses MCP tools; Ariadne provides the domain tools and structured results. MCP App rendering depends on host support. The SDK and MCP do not hold private keys, and local test success does not prove provider completeness, universal cross-host behavior, or funded execution for every asset and issuer. The experimental Vercel Remote MCP transport is deployed, but the verified cloud-egress path returned Binance compliance code `40304`; Remote MCP Live is not the recommended competition evaluation route. Use local stdio for the supported evaluator path.
