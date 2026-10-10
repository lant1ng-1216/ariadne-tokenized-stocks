# API Configuration

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

## Binance Web3 Live API

Set the credentials issued for Binance Web3 Live API use in the local `.env` file:

```dotenv
BINANCE_WEB3_API_KEY=your_api_key
BINANCE_WEB3_API_SECRET=your_api_secret
BINANCE_WEB3_BASE_URL=https://web3.binance.com/build
BINANCE_WEB3_PROXY_URL=
BINANCE_WEB3_EVM_RPC_URL=https://bsc-dataseed.binance.org
```

| Variable | Required when | Meaning |
|---|---|---|
| `BINANCE_WEB3_API_KEY` | Live SDK or MCP calls | Binance Web3 API key. Keep it server-side/local. |
| `BINANCE_WEB3_API_SECRET` | Live SDK or MCP calls | Signing secret used by the client to authenticate provider requests. It is not a wallet key. |
| `BINANCE_WEB3_BASE_URL` | Optional | Binance Web3 API base URL; defaults to `https://web3.binance.com/build`. |
| `BINANCE_WEB3_PROXY_URL` | Optional | HTTP proxy URL when the current network requires one. Ariadne passes this value to its `proxyUrl` option. It does not automatically read `HTTPS_PROXY`. |
| `BINANCE_WEB3_EVM_RPC_URL` | Optional for BSC on-chain reads | BSC JSON-RPC endpoint used for allowance, balance, transaction and finality reads; defaults to `https://bsc-dataseed.binance.org`. Set a BSC endpoint if replacing it. |

The SDK library does not read `.env` or environment variables by itself. The application passes them into `BinanceWeb3Client`, including `proxyUrl: process.env.BINANCE_WEB3_PROXY_URL || undefined`. Node.js `>=22.19.0` can load a local file with `node --env-file=.env app.js`; the application may use another secret manager instead.

For the published MCP package, the host must pass these variables to the spawned stdio process; `npx` does not load the repository's `.env`. For a source checkout, `npm run mcp:config:live` prints a command using `node --env-file=.env`. The package and configuration steps are detailed in [MCP Package Usage](docs/MCP_USAGE.md).

## Optional wallet-handoff configuration

These variables are not needed for read-only catalog, research, comparison or Live provider quotes. They are needed to create an external browser purchase-intent link:

| Variable | Process | Meaning |
|---|---|---|
| `ARIADNE_WALLET_HANDOFF_RELAY_URL` | MCP | Local loopback URL for an embedded relay, or the base HTTPS URL of a separately hosted relay. |
| `ARIADNE_WALLET_HANDOFF_RELAY_SECRET` | MCP and relay | Shared server-to-server secret (at least 32 characters); never expose it to a browser or Agent. |
| `ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN` | Relay | Public origin serving the branded page and relay API; for hosted use it must be the same stable HTTPS origin. A local loopback relay defaults this to its loopback origin. |
| `ARIADNE_WALLET_HANDOFF_STORE_PATH` | Relay | Private local session-store path; defaults to `data/ariadne-wallet-handoff/sessions.json`. |

The local MCP process can start an embedded loopback relay when the configured loopback URL is not already serving one. A hosted relay must already be reachable over HTTPS. See [Wallet Host Bridge](docs/ARIADNE_WALLET_HOST_BRIDGE.md) for the exact handoff boundary and host limitations.

`ARIADNE_MODE=demo` selects synthetic, read-only sample data for the MCP package and does not use Binance credentials. Omitting it selects Live mode; Live MCP startup requires both Binance credentials. The SDK has no Demo/Live mode switch: it uses whichever client/configuration the application supplies.

`ARIADNE_GATEWAY_TOKEN` is optional and only applies when `BINANCE_WEB3_BASE_URL` points to an Ariadne HTTPS egress gateway configured to require that token. It is not needed for the direct Binance Web3 endpoint. `ARIADNE_REOWN_PROJECT_ID` is an optional public client identifier for the MCP App's in-panel WalletConnect fallback; it is not a Binance credential or wallet secret.

The `.env` file is local-only and is excluded by `.gitignore`. Never commit API secrets, relay secrets, wallet private keys, or seed phrases. Ariadne does not hold or generate user wallet signatures.
