# Ariadne SDK 使用方式

SDK 的设计原则是：开发者使用高层领域能力，而不是自行拼接 Binance Web3 API endpoint。

```ts
import { BinanceWeb3Client, TokenizedStocksService } from "ariadne-tokenized-stocks";

const client = new BinanceWeb3Client({
  apiKey: process.env.BINANCE_WEB3_API_KEY!,
  apiSecret: process.env.BINANCE_WEB3_API_SECRET!
});

const stocks = new TokenizedStocksService(client);
const assets = await stocks.search("NVDA", { chainId: "56" });
const context = await stocks.marketContext(assets[0]);
```

报价时 SDK 会根据平台选择模式：

- bStocks 使用普通聚合报价；
- Ondo 自动加入 `userWalletAddress`，使用 RFQ 需要的参数；
- RFQ 的 `/swap` 返回值包含 `typedDataToSign`；应用层签名后可通过 `submitRfqOrder()` 提交，并用 `rfqOrderStatus()` 查询结算状态。SDK 不持有私钥，也不会替用户签名。
- 不支持或字段不足时返回结构化 warning，不猜测结果。

交易计划通过 `createActionPlan` 生成，不代表已经执行交易。真实执行必须在后续完成交易构建、模拟、用户确认和签名边界后进行。
