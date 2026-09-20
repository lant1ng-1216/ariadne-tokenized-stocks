import assert from "node:assert/strict";
import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TransactionService } from "../src/services/transaction.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Configure .env first");

const tx = new TransactionService(new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL }));
const result = await tx.simulateEvm("56", {
  from: "0x0000000000000000000000000000000000000000",
  to: "0x0000000000000000000000000000000000000000",
  value: "0",
  data: "0x"
});

assert.equal(typeof result.success, "boolean");
assert.ok(Array.isArray(result.balanceChanges));
assert.ok(Array.isArray(result.allowanceChanges));
console.log(JSON.stringify({ success: result.success, status: result.status, warnings: result.warnings }, null, 2));
