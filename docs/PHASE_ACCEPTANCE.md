# Ariadne Phase Acceptance

This checklist is the source of truth for implementation status. A phase is not complete merely because a basic function runs: required work must have reproducible evidence, limitations must be disclosed, and external blockers must remain explicitly marked.

## Current audit

| Metric | Result |
|---|---:|
| Acceptance items | 88 |
| Verified | 80 |
| Incomplete or externally blocked | 8 |

## Verified capabilities

- Signed Binance Web3 API adapter with GET, POST, timeouts, retries, backoff and request observations.
- RWA search, token lists, prices, reference prices, underlying data, market context and candles.
- Platform-aware asset identity for Ondo and bStocks on BSC.
- Wallet balances, portfolio overview, transaction history and transaction detail.
- DeFi protocol and investment discovery.
- Domain normalizers for prices, decimals, missing fields, market states, risk tokens and dust.
- RFQ/Standard execution-mode abstraction with external signing boundaries.
- ActionPlan state machine: draft, simulation, confirmation, expiry and execution checks.
- Allowance and safety checks for market state, price impact and slippage.
- Retry policy for `42900`, `50000`, `50001` and HTTP 5xx; `Retry-After` is honored.
- MCP stdio server with 12 tools and a real Codex client smoke test.
- No-funds Preview that stops clearly at allowance or balance safety checks.

## Incomplete or deferred items

| Item | Status | Reason |
|---|---|---|
| Real RFQ signature and settlement | Partial / deferred | Requires an external wallet signature |
| DeFi Positions | Blocked | Three documented request variants return business code `50000` from the upstream service |
| Error/limit evidence | Partial | No destructive live `42900` test is performed |
| Read-only integration completeness | Partial | Depends on DeFi Positions |
| Post-trade balance changes | Partial / deferred | Requires a funded successful transaction |
| Successful broadcast | Partial / deferred | Requires a funded wallet and explicit external signature |
| Demo video | Not started | Deliberately postponed until product work is complete |
| Reviewer no-credential mode | Partial | Live API access requires reviewer-owned credentials |

The current audit intentionally counts the eight rows above as incomplete or externally blocked. The detailed table is kept concise here; implementation evidence is in `docs/DEVELOPER_EXPERIENCE_LOG.md`.

## Acceptance rule

No external wallet signature, funded broadcast, or upstream service recovery is implied by the verified status above.
