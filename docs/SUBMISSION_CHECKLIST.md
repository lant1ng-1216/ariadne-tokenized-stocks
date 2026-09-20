# Submission and Reviewer Checklist

## Reviewer run path

1. Run `npm install`.
2. Copy `.env.example` to `.env` and add the reviewer’s own Binance Web3 credentials.
3. Replace `cwd` in `docs/mcp-config.example.json` with the absolute project path.
4. Connect the MCP server to Codex or Claude Code.
5. Use the prompt in `docs/DEMO_SCRIPT.md`.

## Expected result

- The Agent discovers multiple representations of NVDA.
- Platform, chain and contract identities remain visible.
- Market context and quotes are returned from live APIs.
- The ActionPlan exposes safety checks and a clear next step.
- An unfunded wallet is stopped by allowance or balance checks.
- No private key is handled and no transaction is broadcast.

## Verification commands

```bash
npm run typecheck
npm run test:domain
npm run test:retry-policy
npm run test:mcp-config
npm run test:mcp
npm run audit:phases
```

## Disclosed limitations

- DeFi Positions may return upstream business code `50000` and must not be treated as an empty position response.
- RFQ settlement requires an external wallet EIP-712 signature.
- Funded live broadcast and post-trade balance verification are deferred end-to-end checks.
- Ariadne never stores private keys or signs on behalf of users.
