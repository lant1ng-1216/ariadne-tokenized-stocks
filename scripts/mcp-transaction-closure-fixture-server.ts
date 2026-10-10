import { z } from "zod";
import { privateKeyToAccount } from "viem/accounts";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { BinanceWeb3Error } from "../src/errors.js";
import { buildMcpServer } from "../src/mcp/server.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { BSC_SUPPORTED_INPUT_TOKENS } from "../src/services/bsc-token-registry.js";
import type { VerifiedTokenIdentity } from "../src/domain/types.js";
import type { TransactionService } from "../src/services/transaction.js";

process.env.ARIADNE_TEST_FIXTURE = "1";

const wallet = privateKeyToAccount(`0x${"11".repeat(32)}`).address;
const inputToken = BSC_SUPPORTED_INPUT_TOKENS.USDT.contractAddress;
const outputToken = "0x6666666666666666666666666666666666666666";
const spender = "0x4444444444444444444444444444444444444444";
const router = "0x3333333333333333333333333333333333333333";
const swapHash = `0x${"ef".repeat(32)}`;
const walletHash = `0x${"ad".repeat(32)}`;
const portalWalletHash = `0x${"12".repeat(32)}`;
const allowanceContinuationHash = `0x${"34".repeat(32)}`;
const approvalHash = `0x${"cd".repeat(32)}`;
let allowance = 0n;
let inputBalance = 3_000_000_000_000_000_000n;
let outputBalance = 0n;
let nativeBalanceReads = 0;
let approvalReceipt: unknown | null = null;
let approvalTransaction: unknown | null = null;
let mockBroadcasts = 0;
let fixtureProviderRequests = 0;
let failNextSimulationForWalletFunds = false;
let failNextQuoteRead = false;
const walletTransactions = new Map<string, Record<string, unknown>>();

const tokenMetadata: VerifiedTokenIdentity = {
  chainId: "56", contractAddress: inputToken, symbol: "USDT", name: "Tether USD", decimals: 18,
  verifiedAt: 1_800_000_000_000, verificationSource: "bsc-eth-call"
};
const stockMetadata: VerifiedTokenIdentity = {
  chainId: "56", contractAddress: outputToken, symbol: "TESTB", name: "Synthetic Test Stock", decimals: 18,
  verifiedAt: 1_800_000_000_000, verificationSource: "bsc-eth-call"
};
const metadataReader = async (_chainId: string, address: string) => address.toLowerCase() === inputToken.toLowerCase() ? tokenMetadata : stockMetadata;

const provider = {
  async get(path: string, params?: Record<string, string>) {
    fixtureProviderRequests += 1;
    if (path.endsWith("/rwa/search")) return { code: 0, success: true, data: [{ ticker: "TEST", companyName: "Synthetic Test Stock", assets: [{
      binanceChainId: "56", tokenContractAddress: outputToken, platformId: "bstock", tokenSymbol: "TESTB", assetType: "STOCK"
    }] }] };
    if (path.endsWith("/rwa/platforms")) return { code: 0, success: true, data: [{ platformId: "bstock" }] };
    if (path.endsWith("/rwa/tokens")) return { code: 0, success: true, timestamp: Date.now(), data: [{
      binanceChainId: "56", tokenContractAddress: outputToken, platformId: "bstock", tokenSymbol: "TESTB",
      underlyingTicker: "TEST", underlyingName: "Synthetic Test Stock", statusInfo: { marketStatus: "unknown", openState: true }
    }] };
    if (path.endsWith("/rwa/price")) return { code: 0, success: true, timestamp: Date.now(), data: [{
      binanceChainId: "56", tokenContractAddress: outputToken, platformId: "bstock", tokenPrice: "1", referencePrice: "1",
      tokenPriceUpdatedAt: Date.now()
    }] };
    if (path.endsWith("/aggregator/quote")) {
      if (failNextQuoteRead) {
        failNextQuoteRead = false;
        throw new BinanceWeb3Error("Binance Web3 API 503: synthetic quote unavailable", 503, 503, true);
      }
      return { code: 0, success: true, data: [{
        quoteId: "mcp-closure-fixture-quote", executionMode: "SWAP", toTokenAmount: "1000000000000000000",
        priceImpactPercent: "0.1", vendorName: "FixtureRouter", approveTarget: spender, tradeFee: "0.01"
      }] };
    }
    if (path.endsWith("/aggregator/swap")) return { code: 0, success: true, data: { executionMode: "SWAP", tx: {
      from: params?.userWalletAddress ?? wallet, to: router, value: "0", data: "0x1234",
      minReceiveAmount: "995000000000000000", slippagePercent: "0.5"
    } } };
    if (path.endsWith("/aggregator/approve-transaction")) {
      const amount = BigInt(params?.approveAmount ?? "0").toString(16).padStart(64, "0");
      const spenderData = spender.slice(2).toLowerCase().padStart(64, "0");
      return { code: 0, success: true, data: [{ data: `0x095ea7b3${spenderData}${amount}`, dexContractAddress: spender, gasLimit: "70000", gasPrice: "100000000" }] };
    }
    if (path.endsWith("/pre-transaction/gas-price")) return { code: 0, success: true, data: { evmLegacyGasPrice: { highGasPrice: "100000000" } } };
    throw new Error(`Unexpected fixture provider GET: ${path}`);
  },
  async post(path: string) {
    fixtureProviderRequests += 1;
    if (path.endsWith("/pre-transaction/gas-limit")) return { code: 0, success: true, data: { gasLimit: "100000" } };
    if (path.endsWith("/pre-transaction/simulate")) return { code: 0, success: true, data: { status: "SUCCESS", balanceChanges: [], allowanceChanges: [] } };
    throw new Error(`Unexpected fixture provider POST: ${path}`);
  }
} as unknown as BinanceWeb3Client;

const stocks = new TokenizedStocksService(
  provider,
  async () => allowance,
  async () => inputBalance,
  metadataReader,
  async (_chainId, hash) => hash.toLowerCase() === approvalHash.toLowerCase() ? approvalReceipt : null,
  async (_chainId, hash) => hash.toLowerCase() === approvalHash.toLowerCase() ? approvalTransaction : null,
  async () => 0x1000n,
  async () => 1_000_000_000_000_000n
);
const transactions = {
  async simulateEvm() {
    if (failNextSimulationForWalletFunds) {
      failNextSimulationForWalletFunds = false;
      return { success: false, status: "FAILED", walletFundsOnlyFailure: true, balanceChanges: [], allowanceChanges: [], warnings: ["BEP20: transfer amount exceeds balance"] };
    }
    return { success: true, status: "SUCCESS", balanceChanges: [], allowanceChanges: [], warnings: [] };
  },
  async nativeBalance() { nativeBalanceReads += 1; return 0n; },
  async erc20Balance(_chainId: string, tokenAddress: string) { return tokenAddress.toLowerCase() === inputToken.toLowerCase() ? inputBalance : outputBalance; },
  async erc20Allowance() { return allowance; },
  async broadcastSigned() { mockBroadcasts += 1; return { txHash: swapHash }; },
  async transactionReceipt(_chainId: string, hash: string) {
    if (hash.toLowerCase() === swapHash.toLowerCase()) {
      inputBalance = 2_000_000_000_000_000_000n;
      outputBalance = 995_000_000_000_000_000n;
      return { transactionHash: swapHash, from: wallet, blockNumber: "0x30", status: "0x1" };
    }
    if (hash.toLowerCase() === allowanceContinuationHash.toLowerCase()) {
      inputBalance = 2_000_000_000_000_000_000n;
      outputBalance = 995_000_000_000_000_000n;
      return { transactionHash: hash, from: wallet, blockNumber: "0x33", status: "0x1" };
    }
    if (walletTransactions.has(hash.toLowerCase())) {
      if (hash.toLowerCase() === portalWalletHash.toLowerCase()) {
        inputBalance = 0n;
        outputBalance = 2_985_000_000_000_000_000n;
      } else {
        inputBalance = 1_000_000_000_000_000_000n;
        outputBalance = 1_990_000_000_000_000_000n;
      }
      return { transactionHash: hash, from: wallet, blockNumber: hash.toLowerCase() === portalWalletHash.toLowerCase() ? "0x32" : "0x31", status: "0x1" };
    }
    return null;
  },
  async latestFinalizedBlockNumber() { return 0x1000n; },
  async transactionByHash(_chainId: string, hash: string) {
    return walletTransactions.get(hash.toLowerCase()) ?? null;
  }
} as unknown as TransactionService;

const server = buildMcpServer({ stocks, transactions });
server.registerTool("set_test_approval_receipt", {
  description: "Test-fixture only: model an approval receipt without signing or broadcasting.",
  inputSchema: z.object({ plan: z.any() })
}, async ({ plan }) => {
  allowance = BigInt(plan.amountBaseUnits);
  approvalReceipt = { transactionHash: approvalHash, from: plan.walletAddress, blockNumber: "0x20", status: "0x1" };
  approvalTransaction = { from: plan.walletAddress, to: plan.inputToken.contractAddress, input: plan.unsignedTransaction.data, value: "0x0", gas: plan.unsignedTransaction.gas, gasPrice: plan.unsignedTransaction.gasPrice };
  return { content: [{ type: "text" as const, text: JSON.stringify({ fixtureOnly: true, fixtureProviderRequests, mockBroadcasts, externalNetworkRequests: 0 }) }] };
});
server.registerTool("set_test_input_balance", {
  description: "Test-fixture only: set the mocked USDT balance without any external network request.",
  inputSchema: z.object({ balance: z.string().regex(/^\d+$/) })
}, async ({ balance }) => {
  inputBalance = BigInt(balance);
  return { content: [{ type: "text" as const, text: JSON.stringify({ fixtureOnly: true, externalNetworkRequests: 0, nativeBalanceReads }) }] };
});
server.registerTool("set_test_wallet_funds_simulation", {
  description: "Test-fixture only: make the next transaction simulation report only a wallet-funds limitation.",
  inputSchema: z.object({})
}, async () => {
  failNextSimulationForWalletFunds = true;
  return { content: [{ type: "text" as const, text: JSON.stringify({ fixtureOnly: true, externalNetworkRequests: 0 }) }] };
});
server.registerTool("set_test_quote_failure", {
  description: "Test-fixture only: make the next quote request fail with a retryable synthetic provider error.",
  inputSchema: z.object({})
}, async () => {
  failNextQuoteRead = true;
  return { content: [{ type: "text" as const, text: JSON.stringify({ fixtureOnly: true, externalNetworkRequests: 0 }) }] };
});
server.registerTool("get_fixture_counters", {
  description: "Test-fixture only: return network/broadcast counters.", inputSchema: z.object({})
}, async () => ({ content: [{ type: "text" as const, text: JSON.stringify({ fixtureProviderRequests, mockBroadcasts, nativeBalanceReads, externalNetworkRequests: 0 }) }] }));
server.registerTool("set_test_wallet_submission", {
  description: "Fixture-only stand-in for a host wallet returning an EIP-1193 transaction hash; makes no chain request.",
  inputSchema: z.object({ transaction: z.record(z.string(), z.string()), txHash: z.string().optional() })
}, async ({ transaction, txHash }) => {
  const hash = txHash ?? walletHash;
  walletTransactions.set(hash.toLowerCase(), {
    hash, chainId: "0x38", from: transaction.from, to: transaction.to,
    value: transaction.value, input: transaction.data, gas: transaction.gas, gasPrice: transaction.gasPrice
  });
  return { content: [{ type: "text" as const, text: JSON.stringify({ fixtureOnly: true, walletHash: hash, externalNetworkRequests: 0 }) }] };
});

serveStdio(() => server, { onerror: (error) => console.error(`Fixture MCP transport error: ${error.name}`) });
