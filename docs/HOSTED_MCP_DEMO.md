# Hosted Demo MCP (Local POC)

This repository includes a local proof of concept for a remote MCP transport. It is deliberately restricted to deterministic Demo Mode:

```bash
npm run mcp:hosted-demo
```

The endpoint is `http://127.0.0.1:8787/mcp` and the health check is `/healthz`. It does not read Binance credentials, call the live Binance API, sign, broadcast or mutate a wallet.

The POC uses Streamable HTTP while preserving the same MCP tool surface as the local stdio server. The end-to-end test starts the HTTP server, connects with an MCP HTTP client, lists tools and calls `research_tokenized_stock`.

This is not a public deployment. Production hosting would require authentication, tenant isolation, rate limiting, observability and a separate Live Mode credential design before exposing an Internet-facing endpoint.

The repository also contains a local web research workspace. Run `npm run web:demo` for deterministic Demo Mode, or `npm run web:live` for a server-side credentialed read-only research surface. Live Read-only Mode exposes asset discovery, market context and public-address wallet exposure to the browser; it does not expose trading, wallet mutation, signing or broadcast operations. It is still local-only and is not a production deployment.

The web wallet surface accepts only a validated public EVM address through `GET /api/exposure?walletAddress=0x...&query=NVDA&chainId=56`. It joins returned balances with the current tokenized-stock directory, marks unmatched holdings explicitly and reports missing prices instead of estimating them. Private keys, seed phrases, signatures and transaction data are never accepted by this route.

The same surface provides a read-only quote preview through `GET /api/quote?walletAddress=0x...&query=NVDA&platformId=bstock&amount=10&chainId=56`. It requires an explicit issuer, returns the normalized quote and warnings, and never creates an ActionPlan or approval transaction. A quote is evidence for a later user-controlled step, not an executable order.

The web surface returns a request ID and Ariadne-path duration for health and research responses. Upstream research failures are converted into a stable, retryable `research_unavailable` response without returning raw upstream error text to the browser. Non-GET requests are rejected with `405` and `Allow: GET`.
