# Remote MCP usage and current status

## Connect

Use a client supporting **Streamable HTTP MCP with OAuth**. Add `https://ariadne-remote-mcp.vercel.app/api/mcp` as a remote server and complete the client-initiated browser login and consent. The public server URL is not a local executable or a page intended for ordinary browser navigation. Each user signs in; do not put another user's access token into a config file. The hosted service supplies its own server-side Binance configuration, so end users do not provide Binance API keys.

If your client lacks remote OAuth support, use the [local stdio package](MCP_USAGE.md). MCP Apps views are optional client UI capabilities; the tools should still return readable text/structured data where the host cannot render them.

## Verified and unverified behavior

| Area | Current evidence |
| --- | --- |
| Remote authentication and tool discovery | Clean-client OAuth authorization and tool discovery completed. |
| Live BSC catalog, search and issuer-aware research | Observed through the hosted service, using Live upstream data. Coverage follows the provider response and may be incomplete. |
| Purchase-intent handoff | A non-broadcast wallet-free review link was created and the formal review page could be loaded. |
| MCP App UI | Catalog, research and purchase views were bundled and rechecked after a prior missing-view defect. Rendering depends on the client. |
| Wallet-bound quote, signing and settlement | Not established in the clean remote journey. MetaMask showed a risk warning; a generated review link alone is not transaction evidence. |

The service does not autonomously sign or spend. Any later wallet action needs explicit user review in the wallet. Do not bypass a wallet risk warning merely to complete a demonstration.

## Connection troubleshooting

- If the client lists only local-command MCP servers, it may lack the remote HTTP/OAuth integration required here. Use a compatible client or the local stdio package.
- If login opens but tools are absent, check whether consent completed and whether the client refreshed its tool catalog. Do not substitute web-search results for an MCP call.
- If an MCP App view fails but the text result arrives, record the host and the specific view. Host support for MCP Apps varies.
- A browser visit to the MCP endpoint is not a valid tool test; use an MCP client.

[Repository quickstart](QUICKSTART.md) · [Local MCP package](MCP_USAGE.md) · [SDK usage](SDK_USAGE.md)
