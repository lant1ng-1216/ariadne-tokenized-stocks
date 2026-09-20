import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TransactionService } from "../src/services/transaction.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const tx = new TransactionService(new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL }));
const evmTx = { from: "0x0000000000000000000000000000000000000000", to: "0x0000000000000000000000000000000000000000", value: "0", data: "0x" };
const [chains, gas, block, limit] = await Promise.all([
  tx.supportedChains(), tx.gasPrice("56"), tx.latestBlockHeight("56"), tx.gasLimit("56", evmTx)
]);
console.log(JSON.stringify({
  supportedChainCount: chains.length,
  gasPrice: gas,
  latestBlockHeight: block,
  gasLimit: limit,
  simulationInput: evmTx
}, null, 2));
