import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TransactionService } from "../src/services/transaction.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const tx = new TransactionService(new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL }));
const zero = "0x0000000000000000000000000000000000000000";
const history = await tx.transactionsByAddress(zero, ["56"], { limit: 5 });
const first = (history as any[])?.[0]?.transactionList?.[0];
const detail = first?.txHash ? await tx.transactionDetail("56", first.txHash) : [];
const orders = await tx.broadcastOrders(zero, "56", { limit: 5 });
console.log(JSON.stringify({
  historyCount: (history as any[])?.[0]?.transactionList?.length ?? 0,
  firstTransaction: first,
  detailCount: detail.length,
  detail,
  broadcastOrders: orders
}, null, 2));
