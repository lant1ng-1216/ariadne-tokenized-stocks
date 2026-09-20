# SDK Usage

```ts
import { BinanceWeb3Client, TokenizedStocksService } from "ariadne-tokenized-stocks";

const client = new BinanceWeb3Client({
  apiKey: process.env.BINANCE_WEB3_API_KEY!,
  apiSecret: process.env.BINANCE_WEB3_API_SECRET!,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL
});

const stocks = new TokenizedStocksService(client);
const assets = await stocks.search("NVDA", { chainId: "56" });
const context = await stocks.marketContext(assets[0]);
```

The SDK preserves platform-aware asset identity, market warnings, RFQ/standard execution mode and unsigned transaction boundaries. It never stores a wallet private key or signs on behalf of a user.

For RFQ routes, call `prepareRfqSigningRequest()` and pass the returned typed data to an external wallet. Submit the wallet-produced signature with `submitRfqOrder()` and poll `rfqOrderStatus()`.
