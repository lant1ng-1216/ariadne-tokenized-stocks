# Ariadne

**A TypeScript SDK and Model Context Protocol (MCP) server for issuer-aware research and guarded workflows for tokenized stocks and real-world assets on BNB Chain.**

Ariadne preserves the identity of each provider-returned representation—issuer, chain, contract, and token symbol—while exposing market context, data provenance, warnings, and explicit action boundaries. It integrates with existing MCP-capable Agent hosts or can be used directly from a Node.js application through the SDK.

The MCP server supports credential-free Demo configuration and authenticated Live configuration; the SDK can be integrated independently.

## Requirements

- Node.js `>=22.19.0`
- npm
- For Live API use: Binance Web3 API credentials
- For wallet workflows: a compatible external wallet; Ariadne never stores private keys

## Install and try the MCP Demo

```bash
git clone https://github.com/lant1ng-1216/ariadne-tokenized-stocks.git
cd ariadne-tokenized-stocks
npm ci
npm run mcp:config:demo
```

Add the generated configuration to an MCP-capable Agent host. The command uses the current local checkout path. Demo Mode is deterministic, read-only, and uses synthetic examples; it needs no Binance credentials or wallet.

For an undecided user, try browsing the BSC catalog first. After choosing a company, ask the Agent to research or compare its returned issuer representations. Host-side tool selection depends on the Agent; tools can also be invoked explicitly.

## Live MCP configuration

```bash
cp .env.example .env
# Add your own Binance Web3 API credentials to .env
npm run mcp:config:live
```

Copy the generated configuration to your Agent host. Keep `.env` local and never commit credentials. Read-only research and quotes do not sign or broadcast transactions. A purchase workflow requires explicit user review and a separate external-wallet confirmation.

## TypeScript SDK

The SDK is currently distributed as a local package tarball; it has not been published to npm.

```bash
npm ci
npm run build
npm pack
```

Install the tarball path printed by `npm pack` in a consuming Node.js project. See [SDK usage](docs/SDK_USAGE.md) for imports, explicit issuer selection, data provenance, ActionPlan preparation, and the guarded BSC EVM execution boundary. `npm run test:cleanroom` builds the tarball and verifies it in an isolated consumer without publishing it.

## Documentation

- [Quickstart](docs/QUICKSTART.md) — Demo and Live MCP setup
- [SDK usage](docs/SDK_USAGE.md) — standalone SDK integration and execution boundary
- [Developer Experience Report](docs/DEVELOPER_EXPERIENCE_REPORT.md) — English, evidence-based evaluation of onboarding, documentation, API behavior, Agent integration, market observations, and engineering recommendations
- [Product limitations](docs/PRODUCT_LIMITATIONS.md) — provider, host, route, distribution, and evidence boundaries
- [Product architecture](docs/PRODUCT_SURFACE_ARCHITECTURE.md) — SDK, MCP, Agent, and wallet responsibilities
- [API capability matrix](docs/API_CAPABILITY_MATRIX.md) — mapped API and product capabilities
- [Third-party notices](docs/THIRD_PARTY_NOTICES.md) — dependency and license notices

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

Ariadne is an integration layer, not an autonomous Agent or wallet. The Agent host interprets natural language and chooses MCP tools; Ariadne provides the domain tools and structured results. MCP App rendering depends on host support. The SDK and MCP do not hold private keys, and local test success does not prove provider completeness, production hosting, cross-host behavior, or funded execution for every asset and issuer.
