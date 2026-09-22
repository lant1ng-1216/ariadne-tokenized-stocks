# Hosted Demo MCP (Local POC)

This repository includes a local proof of concept for a remote MCP transport. It is deliberately restricted to deterministic Demo Mode:

```bash
npm run mcp:hosted-demo
```

The endpoint is `http://127.0.0.1:8787/mcp` and the health check is `/healthz`. It does not read Binance credentials, call the live Binance API, sign, broadcast or mutate a wallet.

The POC uses Streamable HTTP while preserving the same MCP tool surface as the local stdio server. The end-to-end test starts the HTTP server, connects with an MCP HTTP client, lists tools and calls `research_tokenized_stock`.

This is not a public deployment. Production hosting would require authentication, tenant isolation, rate limiting, observability and a separate Live Mode credential design before exposing an Internet-facing endpoint.
