# Ariadne wallet handoff for Agent hosts

Ariadne keeps research, plan review, and the completion report in the Agent conversation. The wallet confirmation lives in a short-lived branded HTTPS page opened from one browser link. A local loopback relay first launches the exact page through the operating system's default browser; it does not leave a second link that opens the wallet page in the Agent side panel. This avoids relying on an Agent sandbox iframe exposing `window.ethereum`, and it does not use computer-use automation.

## User journey

1. Selecting a stock and issuer expresses purchase intent only. Before calling the purchase-plan tool, the Agent collects and explicitly confirms the current order amount, BSC wallet, maximum slippage, and whether the network fee uses the provider estimate without a hard cap or a user-supplied BNB cap. It never reuses values from an earlier plan, test, or conversation. Ariadne then presents the exact BSC purchase plan: token identities, amounts, minimum output, spender/target, slippage, expiry, and fee policy.
2. The MCP App automatically calls `create_external_stock_purchase_handoff`. Ariadne rechecks the exact transaction, ERC-20 allowance, reviewed gas cap and quote expiry, captures before-balances only for later settlement reconciliation, and reserves one attempt. It does not check whether token or native funds are sufficient. If a transaction-content or authorization check fails, or the relay is unavailable, no portal opens and no wallet request is sent.
3. The Agent provides exactly one one-time browser link. With the local loopback relay, the link opens a small launcher page; its fragment-held capability is posted to the relay, which validates the active handoff and asks the operating system to open the exact portal URL in the default browser. The actual portal load is recorded separately by the wallet page, so launching a browser is never mistaken for loading the page. For a hosted relay, the URL is HTTPS and the host's external-link behavior must be verified on that host.
4. The branded page displays the purchase plan and Ariadne animation. After a short transition, it directly calls EIP-1193 `eth_requestAccounts`; after the reviewed account and BSC chain match, it calls `eth_sendTransaction` with the exact request. It does not fake a click. If the browser or wallet rejects the automatic request before a transaction call starts, a manual fallback appears. MetaMask remains responsible for the final user confirmation, signing and broadcast.
5. The page sends only the wallet-returned transaction hash and the connected account/chain to the one-time relay. Ariadne verifies that the observed BSC transaction matches the exact reviewed sender, target, value, calldata and gas limit. It then waits for finality and compares the before/after USDT and stock-token balances. A hash or wallet popup is never treated as a completed purchase.
6. The MCP App polls the same handoff. At a terminal verified outcome it updates model context and, when the Agent host advertises MCP Apps `ui/message`, sends an explicit Ariadne status notification that triggers the Agent's detailed completion report in the conversation. If a host does not support that capability, the verified outcome remains visible in the panel and the limitation is stated; an automatic chat report is not claimed.

The page capability is a random one-time token carried in the URL fragment; the page removes it from browser history before requesting plan data. The local launcher also keeps the capability in the fragment and sends it only in a same-device loopback POST body. URL fragments are not included in the initial page request, and the relay stores only a hash of the capability. The relay service secret is server-to-server and must never be placed in the page, URL, Agent prompt, or client bundle. The relay writes its short-lived session state atomically with owner-only file permissions; run one relay instance, or replace the file store with shared durable storage before using multiple instances. Submitted sessions are retained until they reach a terminal state.

## Configuration

The MCP server and relay share the same service secret. The portal origin must be the same stable HTTPS origin that serves the page and API. Plain HTTP is accepted only for loopback fixture tests.

```dotenv
ARIADNE_WALLET_HANDOFF_RELAY_URL=https://wallet.example.com
ARIADNE_WALLET_HANDOFF_RELAY_SECRET=<random server-to-server secret, at least 32 characters>

# Relay process configuration
ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN=https://wallet.example.com
ARIADNE_WALLET_HANDOFF_STORE_PATH=data/ariadne-wallet-handoff/sessions.json
```

In local loopback mode, `npm run mcp` probes the configured relay during startup. It reuses a healthy existing instance or starts an embedded relay on the configured loopback origin and closes that embedded instance with the MCP process. `npm run mcp:wallet-handoff-relay` remains available for running the relay independently during diagnostics. A hosted deployment keeps the relay independent: MCP probes its HTTPS health endpoint and reports an actionable readiness error while leaving read-only research available. Hosting, DNS, certificate setup, and deployment are intentionally not performed in the current engineering phase.

Purchase-plan creation checks relay readiness before requesting provider quotes. A usable plan is returned only when its one-time browser link was created in the same response. Unavailable, misconfigured, or interrupted relay operations return an explicit wallet-handoff diagnostic and no usable plan; raw network errors such as `fetch failed` are not presented as the product-level explanation.

## Security and failure behavior

- The relay requires the service secret for session creation and internal status updates. Public session reads/submissions require the matching one-time capability and same-origin requests.
- Each capability accepts a single terminal wallet submission. A second hash cannot replace the first. Expired, wrong-account, wrong-chain and invalid-result cases fail closed.
- The portal reads a full plan but never a private key, recovery phrase, or signing secret. The wallet signs and broadcasts.
- A wallet error after `eth_sendTransaction` was called is treated as uncertain. Do not submit again; inspect the wallet's activity and chain state.
- The MCP process must stay available through reconciliation because its plan registry and before-balance snapshot remain process-local. The relay survives a relay restart, but it cannot reconstruct the MCP process's lost transaction evidence.
- A terminal `confirmed` status is written only after transaction-field checks, finalized successful receipt, and exact expected balance changes. Pending, reverted, unknown, and mismatched outcomes remain distinct.

## Agent host capabilities

The MCP App uses the standard `openLink`, `updateModelContext`, and `sendMessage` host features. Ariadne checks the host's advertised capabilities. Hosts that omit `openLinks` receive a visible portal link fallback; hosts that omit text messaging cannot be claimed to deliver an autonomous conversation report. The user can still see the verified terminal result in the panel.

The separate `connect_bsc_wallet_readonly` tool still uses the in-panel provider/WalletConnect path and requests only the account and BSC network. It is a read-only diagnostic, not the purchase handoff.

## Prior Codex host evidence

On 2026-10-07, the owner tested the older in-panel WalletConnect check in Codex. The panel observed an ephemeral `codex-sandbox://mcp-app-…` origin and stopped before pairing; this did not prove a wallet was connected and no transaction was requested. The external HTTPS handoff is the implementation response to that sandbox-origin limitation. The new relay/page/report path is covered by local fixtures, but it has not yet been exercised from Codex with a configured stable HTTPS relay, a real MetaMask popup, or the host's automatic conversation-message capability. Those live host facts remain unverified; do not mark the purchase handoff as host-passed until that check is performed.
