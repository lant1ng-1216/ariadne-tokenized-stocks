import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TransactionService } from "../src/services/transaction.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const tx = new TransactionService(new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL }));
try {
  const result = await tx.broadcastSigned("56", "0x01", "0x0000000000000000000000000000000000000000");
  console.log(JSON.stringify({ rejected: false, result }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ rejected: true, error: String(error) }, null, 2));
}
