# Third-party notices

## NVIDIA logo

The purchase-review page uses the official NVIDIA logo from the [NVIDIA Newsroom logo library](https://nvidianews.nvidia.com/multimedia/corporate/nvidia-logos) only to identify NVIDIA as the underlying company for an NVDA tokenized-stock plan. NVIDIA and its logo are trademarks of NVIDIA Corporation. Their use does not imply endorsement of Ariadne.

## BNB Chain symbol

The BSC network badge uses the official yellow BNB Chain symbol from the [BNB Chain brand guidelines](https://www.bnbchain.org/en/brand-guidelines). The asset is displayed without changing its color or proportions and only identifies the selected network. Its use does not imply endorsement of Ariadne.

## WalletConnect Universal Provider

Ariadne's BSC purchase-review MCP App uses `@walletconnect/universal-provider` to create a BSC-only wallet session when the Agent host does not expose an EIP-1193 wallet. Ariadne renders the pairing QR locally; it does not load Reown's wallet catalog or remote scripts. The provider and its required runtime components are governed by the WalletConnect Community License, included in [`licenses/WALLETCONNECT_COMMUNITY_LICENSE.md`](licenses/WALLETCONNECT_COMMUNITY_LICENSE.md).

Portions © 2025 Reown, Inc. All Rights Reserved.

## MetaMask Connect EVM

Ariadne's external BSC purchase-review page uses `@metamask/connect-evm` to send one MetaMask connection-and-transaction request that is bound to the reviewed wallet, BSC network and exact purchase transaction. Analytics are disabled. The package is copyright ConsenSys Software Inc. and is distributed under a custom Non-Commercial Use license. A copy of that license is included in [`licenses/METAMASK_CONNECT_LICENSE.md`](licenses/METAMASK_CONNECT_LICENSE.md).

**Prominent notice:** The MetaMask Connect program is used in Ariadne and is copyright ConsenSys Software Inc. Ariadne's use and distribution of that program are restricted to the Non-Commercial Use terms in the included license. The license includes a definition covering resulting programs with no more than 10,000 monthly active users; other use cases require separate permission from ConsenSys.

## TradingView Lightweight Charts

The external BSC purchase-review page uses the `lightweight-charts` package (Apache-2.0) to render candlesticks. Candle values come from Binance Web3's tokenized-stock K-line endpoint for the exact BSC contract in the approved plan; the chart library does not provide prices or historical data. The market snapshot shown beside the chart remains a separate Binance Web3 quote source. The chart page includes the library attribution link; see the package's distributed license for terms.

Use of WalletConnect requires the Reown gateway and WalletConnect messaging network, unless Reown separately approves otherwise. The current community license also sets RPC and monthly active user thresholds for commercial licensing, requires attribution and license redistribution, and contains terms on modifications and dispute resolution. Review the full included license and current Reown terms before distribution or commercial-scale use. `ARIADNE_REOWN_PROJECT_ID` is a public client identifier and must be configured for the panel fallback; do not place wallet secrets in it.
