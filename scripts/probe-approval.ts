import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { TransactionService } from "../src/services/transaction.js";
import type { UnsignedAction } from "../src/domain/types.js";
import { randomBytes } from "node:crypto";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const client = new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL });
const stocks = new TokenizedStocksService(client);
const transactions = new TransactionService(client);
const syntheticWalletAddress = `0x${randomBytes(20).toString("hex")}`;
const [probeUsdtBalance, probeBnbBalance] = await Promise.all([
  transactions.erc20Balance("56", "0x55d398326f99059fF775485246999027B3197955", syntheticWalletAddress),
  transactions.nativeBalance("56", syntheticWalletAddress)
]);
if (probeUsdtBalance !== 0n || probeBnbBalance !== 0n) throw new Error("Random synthetic probe address is not empty; stop before quote/simulation probing");
const asset = (await stocks.search("NVDA", { chainId: "56", platformId: "bstock" }))[0];
if (!asset) throw new Error("No bStocks NVDA asset");
// Diagnostic cap for this read-only build probe only; it is not a user-selected transaction limit.
const intent = { type: "buy" as const, walletAddress: syntheticWalletAddress, fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955", toAsset: asset, amount: "10", amountDecimals: 18, maxSlippageBps: 50 };
const quote = await stocks.quote(intent);
const route = quote.routes.length === 1 ? quote.routes[0] : undefined;
let swapAction: UnsignedAction | undefined;
let swapBuildError: { code?: string | number; message: string } | undefined;
try {
  if (quote.success && !route) throw new Error(`Live quote returned ${quote.routes.length} routes; probe requires exactly one route and will not choose one automatically`);
  swapAction = quote.success ? await stocks.buildUnsignedAction(intent, quote) : undefined;
} catch (error) {
  const providerError = error as { code?: string | number; message?: string };
  swapBuildError = { ...(providerError.code !== undefined ? { code: providerError.code } : {}), message: providerError.message ?? "Swap builder failed" };
}
const swapPayload = swapAction?.payload as { tx?: { to?: string; minReceiveAmount?: string; slippagePercent?: string; gas?: string; gasPrice?: string } } | undefined;
let simulation: { success: boolean; status?: string; warnings: string[] } | undefined;
if (swapAction?.kind === "evm_transaction" && (swapAction.payload as { tx?: any })?.tx) {
  const result = await transactions.simulateEvm("56", (swapAction.payload as { tx: any }).tx);
  simulation = { success: result.success, ...(result.status ? { status: result.status } : {}), warnings: result.warnings };
}
const approval = route ? await stocks.buildApprovalAction(intent, quote) : undefined;
const spender = route?.approvalTarget;
const allowance = spender ? await transactions.erc20Allowance("56", intent.fromTokenAddress, intent.walletAddress, spender) : undefined;
console.log(JSON.stringify({
  probeWallet: "synthetic empty address; no key loaded or signing attempted",
  startingBalances: { usdtBaseUnits: probeUsdtBalance.toString(), bnbWei: probeBnbBalance.toString() },
  quoteSuccess: quote.success,
  routeCount: quote.routes.length,
  route: {
    executionMode: route?.executionMode,
    vendor: route?.dexName,
    quoteIdPresent: Boolean(route?.quoteId),
    expectedOutputBaseUnitsPresent: Boolean(route?.toTokenAmount),
    providerMinimumOutputPresent: Boolean(route?.minToTokenAmount),
    providerRouteFeeUsd: route?.providerRouteFeeUsd,
    providerEstimatedGasFeeBaseUnits: route?.estimatedGasFeeBaseUnits
  },
  swapBuild: {
    actionKind: swapAction?.kind,
    ...(swapBuildError ? { failure: swapBuildError } : {}),
    transactionTarget: swapPayload?.tx?.to,
    minimumOutputBaseUnits: swapPayload?.tx?.minReceiveAmount,
    appliedSlippagePercent: swapPayload?.tx?.slippagePercent,
    gasLimit: swapPayload?.tx?.gas,
    gasPriceWei: swapPayload?.tx?.gasPrice
  },
  simulation,
  approval: {
    actionKind: approval?.kind,
    chainId: approval?.chainId,
    targetIsInputToken: (approval?.payload as { tx?: { to?: string } } | undefined)?.tx?.to?.toLowerCase() === intent.fromTokenAddress.toLowerCase(),
    calldataSelector: ((approval?.payload as { tx?: { data?: string } } | undefined)?.tx?.data ?? "").slice(0, 10),
    approvalAmount: (approval?.payload as { tx?: { data?: string } } | undefined)?.tx?.data ? `0x${((approval!.payload as { tx: { data: string } }).tx.data).slice(-64)}` : undefined
  },
  spender,
  allowance: allowance?.toString(),
  allowanceReadSucceeded: allowance !== undefined
}, null, 2));
