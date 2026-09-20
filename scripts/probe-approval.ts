import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { TransactionService } from "../src/services/transaction.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const client = new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL });
const stocks = new TokenizedStocksService(client);
const asset = (await stocks.search("NVDA", { chainId: "56", platformId: "bstock" }))[0];
if (!asset) throw new Error("No bStocks NVDA asset");
const intent = { type: "buy" as const, walletAddress: "0x0000000000000000000000000000000000000000", fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955", toAsset: asset, amount: "10", amountDecimals: 18 };
const quote = await stocks.quote(intent);
const approval = await stocks.buildApprovalAction(intent, quote);
const spender = quote.routes[0]?.approvalTarget;
const allowance = spender ? await new TransactionService(client).erc20Allowance("56", intent.fromTokenAddress, intent.walletAddress, spender) : undefined;
console.log(JSON.stringify({ quoteSuccess: quote.success, approval, spender, allowance: allowance?.toString(), allowanceReadSucceeded: allowance !== undefined }, null, 2));
