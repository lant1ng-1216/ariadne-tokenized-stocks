# Ariadne Demo Script

## Setup

```bash
npm install
npm run typecheck
```

Configure `.env` locally and connect `docs/mcp-config.example.json` to Codex or Claude Code. Never place credentials in the MCP configuration.

## Demo prompt

> Search for NVIDIA tokenized stocks on BSC. Compare the available platform versions. Use the bStocks version to create a plan to buy 10 USDT worth. Show the market status, reference price, quote and safety warnings. Do not sign or broadcast any transaction.

## Expected flow

1. The Agent finds Ondo and bStocks identities.
2. Platform, chain and contract identity remain visible.
3. Market context exposes price, reference price, status and warnings.
4. The ActionPlan checks quote validity, market state and allowance.
5. An unfunded wallet stops at a clear safety boundary; this is an expected Preview result, not a fabricated successful trade.
6. No private key is handled and no transaction is broadcast.

## Automated checks

```bash
npm run test:domain
npm run test:mcp
npm run test:retry-policy
npm run audit:phases
```
