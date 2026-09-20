# Ariadne API Capability Matrix

`verified` means tested locally and, where applicable, against the live Binance Web3 API. `partial` means the boundary is implemented but an external dependency remains. `blocked` means client-side investigation is complete but the upstream service is unavailable.

| Module | Capability | Status | Evidence / limitation |
|---|---|---|---|
| Authentication | HMAC-SHA256 signed `/build` requests | verified | Live authenticated requests succeed |
| Runtime | Timeout, retries, backoff and observations | verified | Attempts, latency, business errors and rate headers are recorded |
| RWA | Search, token list, price and underlying data | verified | NVDA returns Ondo and bStocks identities with chain and contract fields |
| Market | Prices, reference prices, candles and analytics | verified | Live market probes pass |
| Trading | Aggregated quotes | partial | Standard and RFQ boundaries are represented; RFQ settlement requires an external wallet signature |
| Trading | Unsigned swap/RFQ preparation | verified | Incomplete RFQ signing payloads are rejected |
| Wallet | Supported chains and token balances | verified | Live BSC responses are normalized with risk and dust warnings |
| Portfolio | Address overview | verified | Live PnL and activity responses are normalized |
| Transaction | Gas, block height, gas limit and simulation | verified | Live calls pass without broadcasting |
| Transaction | Broadcast | partial | External signed payload boundary is implemented; funded success is deferred |
| DeFi | Protocol and investment discovery | verified | Live list and detail responses pass |
| DeFi | Positions | blocked | Three documented variants return HTTP 200 / business code `50000`; this is an upstream service error, not rate limiting |

## Confirmed design constraints

1. The same underlying stock may have multiple platform, chain and contract identities.
2. RWA routes require explicit RFQ handling and external EIP-712 signing.
3. Missing liquidity must not be interpreted as zero liquidity.
4. Unknown market status must not be silently treated as open.
5. Quote success does not guarantee swap construction or execution success.
6. Side-effecting actions require a plan, safety checks, simulation, explicit confirmation and an externally signed payload.
7. Business code `50000` must not be converted into an empty position response; official rate-limit code `42900` is handled separately.
