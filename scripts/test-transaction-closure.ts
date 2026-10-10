import assert from "node:assert/strict";
import { createServer } from "node:http";
import { privateKeyToAccount } from "viem/accounts";
import type { StockAsset, VerifiedTokenIdentity } from "../src/domain/types.js";
import { formatTokenAmount, minimumOutputAfterSlippage, parseTokenAmount } from "../src/domain/amount.js";
import { resolveBscInputToken, verifyBscStockToken, BSC_SUPPORTED_INPUT_TOKENS } from "../src/services/bsc-token-registry.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { TransactionService } from "../src/services/transaction.js";
import { PurchasePlanStageError } from "../src/services/purchase-plan-error.js";
import { SettlementReconciler } from "../src/services/settlement-reconciler.js";
import { bindSettlementTransactionHash } from "../src/services/settlement-hash-binding.js";
import { GuardedEvmExecutionService } from "../src/services/guarded-evm-executor.js";
import { walletTransactionMismatches, type Eip1193Provider } from "../src/services/eip1193-wallet.js";

assert.equal(minimumOutputAfterSlippage("1000000000000000000", 50), "995000000000000000");
assert.equal(minimumOutputAfterSlippage("101", 1), "100");
assert.equal(formatTokenAmount("995000000000000000", 18), "0.995");
assert.equal(parseTokenAmount("1.25", 18), 1_250_000_000_000_000_000n);
assert.throws(() => minimumOutputAfterSlippage("0", 50), /positive integer/);
assert.throws(() => minimumOutputAfterSlippage("100", 10_001), /between 0 and 10000/);

const inputAddress = BSC_SUPPORTED_INPUT_TOKENS.USDT.contractAddress;
const outputAddress = "0x6666666666666666666666666666666666666666";
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const wallet = account.address;
const otherWallet = privateKeyToAccount(`0x${"22".repeat(32)}`).address;
const spender = "0x4444444444444444444444444444444444444444";
const router = "0x3333333333333333333333333333333333333333";
const asset: StockAsset = {
  assetId: `56:${outputAddress}`,
  chainId: "56",
  platformId: "bstock",
  contractAddress: outputAddress,
  tokenSymbol: "TESTB",
  underlyingTicker: "TEST",
  underlyingName: "Synthetic Test Stock"
};
const metadata = (contractAddress: string, symbol: string, decimals: number): VerifiedTokenIdentity => ({
  chainId: "56", contractAddress, symbol, decimals, verifiedAt: 1_800_000_000_000, verificationSource: "bsc-eth-call"
});
const metadataReader = async (_chainId: string, tokenAddress: string) => tokenAddress.toLowerCase() === inputAddress.toLowerCase()
  ? metadata(inputAddress, "USDT", 18)
  : metadata(outputAddress, "TESTB", 18);
const resolverPort = { erc20TokenMetadata: metadataReader };
assert.equal((await resolveBscInputToken(resolverPort, "usdt")).decimals, 18);
assert.equal((await verifyBscStockToken(resolverPort, asset)).symbol, "TESTB");
await assert.rejects(resolveBscInputToken(resolverPort, "USDC"), /not in the supported BSC allowlist/);
await assert.rejects(verifyBscStockToken(resolverPort, { ...asset, tokenSymbol: "FORGED" }), /does not match/);

const rpcAttempts = new Map<string, number>();
const rpcFixture = createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  const call = JSON.parse(body) as { method: string; params: unknown[] };
  rpcAttempts.set(call.method, (rpcAttempts.get(call.method) ?? 0) + 1);
  if (call.method === "eth_chainId" && rpcAttempts.get(call.method) === 1) {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "temporary fixture outage" }));
    return;
  }
  const result = call.method === "eth_chainId" ? "0x38"
    : call.method === "eth_getCode" ? "0x60016000"
      : call.method === "eth_call" && (call.params[0] as { data: string }).data === "0x95d89b41" ? `0x${Buffer.from("USDT").toString("hex").padEnd(64, "0")}`
        : call.method === "eth_call" && (call.params[0] as { data: string }).data === "0x313ce567" ? `0x${18n.toString(16).padStart(64, "0")}`
          : call.method === "eth_call" ? `0x${Buffer.from("Tether USD").toString("hex").padEnd(64, "0")}`
            : undefined;
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result }));
});
await new Promise<void>((resolve, reject) => {
  rpcFixture.once("error", reject);
  rpcFixture.listen(0, "127.0.0.1", resolve);
});
const rpcAddress = rpcFixture.address();
assert.ok(rpcAddress && typeof rpcAddress === "object");
const priorRpcProxy = process.env.BINANCE_WEB3_PROXY_URL;
delete process.env.BINANCE_WEB3_PROXY_URL;
try {
  const verifiedRpcToken = await new TransactionService({} as any).erc20TokenMetadata("56", inputAddress, `http://127.0.0.1:${rpcAddress.port}`);
  assert.equal(verifiedRpcToken.symbol, "USDT");
  assert.equal(verifiedRpcToken.decimals, 18);
  assert.equal(rpcAttempts.get("eth_chainId"), 2, "a transient BSC RPC 503 is retried once before the metadata read succeeds");
} finally {
  if (priorRpcProxy !== undefined) process.env.BINANCE_WEB3_PROXY_URL = priorRpcProxy;
  await new Promise<void>((resolve, reject) => rpcFixture.close((error) => error ? reject(error) : resolve()));
}

const mockClient = {
  async get(path: string, params?: Record<string, string>) {
    if (path.endsWith("/rwa/platforms")) return { code: 0, success: true, data: [{ platformId: "bstock" }] };
    if (path.endsWith("/rwa/tokens")) return { code: 0, success: true, timestamp: Date.now(), data: [{
      binanceChainId: "56", tokenContractAddress: outputAddress, platformId: "bstock", tokenSymbol: "TESTB",
      underlyingTicker: "TEST", underlyingName: "Synthetic Test Stock", statusInfo: { marketStatus: "open", openState: true }
    }] };
    if (path.endsWith("/rwa/price")) return { code: 0, success: true, timestamp: Date.now(), data: [{
      binanceChainId: "56", tokenContractAddress: outputAddress, platformId: "bstock", tokenPrice: "1", referencePrice: "1",
      tokenPriceUpdatedAt: Date.now()
    }] };
    if (path.endsWith("/aggregator/quote")) return { code: 0, success: true, data: [{
      quoteId: "closure-test-quote", executionMode: "SWAP", toTokenAmount: "1000000000000000000",
      priceImpactPercent: "0.1", vendorName: "FixtureRouter", approveTarget: spender, tradeFee: "0.01"
    }] };
    if (path.endsWith("/aggregator/swap")) return { code: 0, success: true, data: { executionMode: "SWAP", tx: {
      from: params?.userWalletAddress ?? wallet, to: router, value: "0", data: "0x1234", minReceiveAmount: "995000000000000000", slippagePercent: "0.5"
    } } };
    if (path.endsWith("/aggregator/approve-transaction")) {
      const amount = BigInt(params?.approveAmount ?? "0").toString(16).padStart(64, "0");
      const spenderData = spender.slice(2).toLowerCase().padStart(64, "0");
      return { code: 0, success: true, data: [{ data: `0x095ea7b3${spenderData}${amount}`, dexContractAddress: spender, gasLimit: "70000", gasPrice: "100000000" }] };
    }
    if (path.endsWith("/pre-transaction/gas-price")) return { code: 0, success: true, data: { evmLegacyGasPrice: { highGasPrice: "100000000" } } };
    throw new Error(`Unexpected fixture GET request: ${path}`);
  },
  async post(path: string) {
    if (path.endsWith("/pre-transaction/gas-limit")) return { code: 0, success: true, data: { gasLimit: "100000" } };
    if (path.endsWith("/pre-transaction/simulate")) return { code: 0, success: true, data: { status: "SUCCESS", balanceChanges: [], allowanceChanges: [] } };
    throw new Error(`Unexpected fixture POST request: ${path}`);
  }
};
const stockService = new TokenizedStocksService(
  mockClient as any,
  async () => 2_000_000_000_000_000_000n,
  async () => 3_000_000_000_000_000_000n,
  metadataReader
);
await assert.rejects(
  stockService.createActionPlan({
    type: "buy", walletAddress: wallet, fromTokenAddress: inputAddress, amount: "1", amountDecimals: 18,
    maxSlippageBps: undefined, toAsset: asset
  } as any),
  /explicit user-reviewed maximum slippage/,
  "an omitted slippage cap must fail before creating a plan"
);
const prepared = await stockService.createBscStockPurchasePlan({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50, maxGasCostBnb: "0.001"
});
assert.equal(prepared.status, "awaiting_confirmation");
assert.equal(prepared.executionMode, "SWAP");
assert.deepEqual(prepared.verifiedTokens, { input: metadata(inputAddress, "USDT", 18), output: metadata(outputAddress, "TESTB", 18) });
assert.equal(prepared.minimumOutput, "995000000000000000");
assert.equal(prepared.estimatedFees?.networkGasLimit, "100000");
assert.equal(prepared.estimatedFees?.estimatedMaxGasCostBnb, "0.00001");
assert.equal(prepared.estimatedFees?.nativeGasBudgetBnb, "0.001");
assert.equal(prepared.estimatedFees?.gasBudgetSource, "user_provided");
assert.equal(prepared.intent.fromTokenAddress, inputAddress);
assert.equal(prepared.intent.amountDecimals, 18);
assert.equal((prepared.unsignedActions?.[0] as any).kind, "evm_transaction");

const estimatedBudgetPlan = await stockService.createBscStockPurchasePlan({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50
});
assert.equal(estimatedBudgetPlan.status, "awaiting_confirmation");
assert.equal(estimatedBudgetPlan.intent.maxGasCostBnb, "0.00001", "missing gas input uses the current estimate as a proposed plan cap");
assert.equal(estimatedBudgetPlan.estimatedFees?.nativeGasBudgetBnb, "0.00001");
assert.equal(estimatedBudgetPlan.estimatedFees?.gasBudgetSource, "provider_high_tier_estimate");

const closureHash = `0x${"ef".repeat(32)}`;
const mismatchedClosureHash = `0x${"ed".repeat(32)}`;
let walletInputBalance = 3_000_000_000_000_000_000n;
let walletOutputBalance = 0n;
let mockedBroadcasts = 0;
let guardedReceiptReads = 0;
const guarded = new GuardedEvmExecutionService({
  async simulateEvm() { return { success: true, status: "SUCCESS", balanceChanges: [], allowanceChanges: [], warnings: [] }; },
  async nativeBalance() { return 1_000_000_000_000_000n; },
  async erc20Balance(_chainId: string, tokenAddress: string) { return tokenAddress.toLowerCase() === inputAddress.toLowerCase() ? walletInputBalance : walletOutputBalance; },
  async erc20Allowance() { return 2_000_000_000_000_000_000n; },
  async latestFinalizedBlockNumber() { return 0x1000n; },
  async broadcastSigned() { mockedBroadcasts += 1; return { txHash: closureHash }; },
  async transactionReceipt() {
    guardedReceiptReads += 1;
    walletInputBalance = 2_000_000_000_000_000_000n;
    walletOutputBalance = 995_000_000_000_000_000n;
    return { transactionHash: closureHash, from: wallet, blockNumber: "0x30", status: "0x1" };
  }
} as any);
guarded.registerPrepared(prepared);
const guardedSimulation = await guarded.simulate(prepared);
assert.equal(guardedSimulation.status, "simulated");
const guardedConfirmation = guarded.confirm(guardedSimulation);
const signedSwap = await account.signTransaction({ type: "legacy", chainId: 56, to: router, value: 0n, data: "0x1234", nonce: 1, gas: 80_000n, gasPrice: 1_000_000_000n });
await guarded.broadcastSigned(guardedConfirmation, signedSwap);
assert.equal(mockedBroadcasts, 1, "the fixture records exactly one non-network broadcaster callback");
await assert.rejects(
  guarded.reconcileBroadcast({ planId: prepared.planId, txHash: mismatchedClosureHash, maxPollAttempts: 1, pollIntervalMs: 0 }),
  /does not match the hash returned by the broadcaster/
);
assert.equal(guardedReceiptReads, 0, "a hash mismatch is rejected before any receipt lookup");
const guardedSettlement = await guarded.reconcileBroadcast({ planId: prepared.planId, maxPollAttempts: 1, pollIntervalMs: 0 });
assert.equal(guardedSettlement.status, "confirmed");
assert.equal(guardedSettlement.success, true);
assert.equal(guardedSettlement.changes?.outputReceived, "995000000000000000");
assert.equal(guardedReceiptReads, 1);

const walletPrepared = await stockService.createBscStockPurchasePlan({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50, maxGasCostBnb: "0.001"
});
let providerInputBalance = 3_000_000_000_000_000_000n;
let providerOutputBalance = 0n;
let providerSendCalls = 0;
let providerTransactionRequest: Record<string, string> | undefined;
const providerHash = `0x${"bc".repeat(32)}`;
const providerGuarded = new GuardedEvmExecutionService({
  async simulateEvm() { return { success: true, status: "SUCCESS", balanceChanges: [], allowanceChanges: [], warnings: [] }; },
  async nativeBalance() { return 1_000_000_000_000_000n; },
  async erc20Balance(_chainId: string, tokenAddress: string) { return tokenAddress.toLowerCase() === inputAddress.toLowerCase() ? providerInputBalance : providerOutputBalance; },
  async erc20Allowance() { return 2_000_000_000_000_000_000n; },
  async latestFinalizedBlockNumber() { return 0x1000n; },
  async transactionByHash(_chainId: string, hash: string) {
    assert.equal(hash, providerHash);
    return {
      hash, chainId: "0x38", from: providerTransactionRequest?.from, to: providerTransactionRequest?.to,
      value: providerTransactionRequest?.value, input: providerTransactionRequest?.data,
      gas: providerTransactionRequest?.gas, gasPrice: providerTransactionRequest?.gasPrice
    };
  },
  async transactionReceipt(_chainId: string, hash: string) {
    assert.equal(hash, providerHash);
    providerInputBalance = 2_000_000_000_000_000_000n;
    providerOutputBalance = 995_000_000_000_000_000n;
    return { transactionHash: hash, from: wallet, blockNumber: "0x31", status: "0x1" };
  }
} as any);
providerGuarded.registerPrepared(walletPrepared);
const providerSimulated = await providerGuarded.simulate(walletPrepared);
const providerConfirmed = providerGuarded.confirm(providerSimulated);
const provider: Eip1193Provider = {
  async request({ method, params }) {
    if (method === "eth_requestAccounts") return [wallet];
    if (method === "eth_chainId") return "0x38";
    if (method === "eth_sendTransaction") {
      providerSendCalls += 1;
      providerTransactionRequest = (params as Array<Record<string, string>>)[0];
      return providerHash;
    }
    throw new Error(`Unexpected EIP-1193 method ${method}`);
  }
};
const walletSubmission = await providerGuarded.sendWithWalletProvider(providerConfirmed, provider);
assert.deepEqual(walletSubmission, { txHash: providerHash, status: "awaiting_reconciliation", walletBroadcast: true });
assert.equal(providerSendCalls, 1, "the wallet provider receives one eth_sendTransaction call");
assert.equal(providerTransactionRequest?.from?.toLowerCase(), wallet.toLowerCase());
assert.equal(providerTransactionRequest?.to?.toLowerCase(), router.toLowerCase());
assert.equal(providerTransactionRequest?.value, "0x0");
assert.equal(providerTransactionRequest?.data, "0x1234");
assert.equal(providerTransactionRequest?.gas, "0x186a0");
assert.equal(providerTransactionRequest?.gasPrice, "0x5f5e100");
const providerReconciliation = await providerGuarded.reconcileBroadcast({ planId: walletPrepared.planId, maxPollAttempts: 1, pollIntervalMs: 0 });
assert.equal(providerReconciliation.status, "confirmed");
assert.equal(providerReconciliation.success, true, "wallet hash, exact transaction fields, successful receipt and balances must reconcile");
assert.deepEqual(walletTransactionMismatches({ from: wallet, to: router, value: "0", data: "0x1234", maxGasCostWei: "1000000000000000" }, {
  from: wallet, to: router, value: "0x0", input: "0x1234", gas: "0x100", gasPrice: "0x1", chainId: "0x38"
}), []);
assert.match(walletTransactionMismatches({ from: wallet, to: router, value: "0", data: "0x1234", maxGasCostWei: "10" }, {
  from: wallet, to: router, value: "0x0", input: "0x1234", gas: "0x100", gasPrice: "0x1", chainId: "0x38"
}).join(" "), /gas settings exceed/);
const overBudgetSnapshot = {
  chainId: "56", walletAddress: wallet, inputToken: metadata(inputAddress, "USDT", 18), outputToken: metadata(outputAddress, "TESTB", 18),
  inputBalance: "2000000000000000000", outputBalance: "0", capturedAt: Date.now()
};
let overBudgetReceiptReads = 0;
const overBudgetWalletSettlement = new SettlementReconciler({
  async transactionByHash() { return { hash: providerHash, from: wallet, to: router, value: "0x0", input: "0x1234", gas: "0x100", gasPrice: "0x2", chainId: "0x38" }; },
  async transactionReceipt() { overBudgetReceiptReads += 1; return { transactionHash: providerHash, from: wallet, blockNumber: "0x32", status: "0x1" }; },
  async latestFinalizedBlockNumber() { return 0x1000n; },
  async erc20Balance() { return 0n; }
});
const overBudgetWalletResult = await overBudgetWalletSettlement.reconcile({
  txHash: providerHash, before: overBudgetSnapshot, expectedInputSpent: "1000000000000000000", minimumOutputReceived: "995000000000000000",
  expectedTransaction: { from: wallet, to: router, value: "0", data: "0x1234", maxGasCostWei: "16" }, maxPollAttempts: 1, pollIntervalMs: 0
});
assert.equal(overBudgetWalletResult.status, "balance_mismatch");
assert.equal(overBudgetWalletResult.success, false);
assert.match(overBudgetWalletResult.mismatches.join(" "), /gas settings exceed/);
assert.equal(overBudgetReceiptReads, 0, "an over-budget wallet transaction is rejected before receipt/balance reconciliation");
assert.match(walletTransactionMismatches({ from: wallet, to: router, value: "0", data: "0x1234", maxGasCostWei: "1000000000000000" }, {
  hash: `0x${"aa".repeat(32)}`, from: wallet, to: router, value: "0x0", input: "0x1234", gas: "0x100", gasPrice: "0x1", chainId: "0x38"
}, providerHash).join(" "), /does not match the wallet-returned hash/);

const wrongWalletPlan = await stockService.createBscStockPurchasePlan({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50, maxGasCostBnb: "0.001"
});
const wrongWalletGuarded = new GuardedEvmExecutionService({
  async simulateEvm() { return { success: true, status: "SUCCESS", balanceChanges: [], allowanceChanges: [], warnings: [] }; },
  async nativeBalance() { return 1_000_000_000_000_000n; }, async erc20Balance() { return 2_000_000_000_000_000_000n; },
  async erc20Allowance() { return 2_000_000_000_000_000_000n; }, async transactionReceipt() { return null; },
  async latestFinalizedBlockNumber() { return 0x1000n; },
  async transactionByHash() { return null; }, async broadcastSigned() { throw new Error("must not use Ariadne broadcast in EIP-1193 handoff"); }
} as any);
wrongWalletGuarded.registerPrepared(wrongWalletPlan);
const wrongWalletConfirmed = wrongWalletGuarded.confirm(await wrongWalletGuarded.simulate(wrongWalletPlan));
let wrongWalletSendCalls = 0;
await assert.rejects(wrongWalletGuarded.sendWithWalletProvider(wrongWalletConfirmed, {
  async request({ method }) {
    if (method === "eth_requestAccounts") return [otherWallet];
    if (method === "eth_chainId") return "0x38";
    wrongWalletSendCalls += 1;
    return providerHash;
  }
}), /does not match the wallet address/);
assert.equal(wrongWalletSendCalls, 0, "wrong connected account is blocked before eth_sendTransaction");
let wrongChainSendCalls = 0;
await assert.rejects(wrongWalletGuarded.sendWithWalletProvider(wrongWalletConfirmed, {
  async request({ method }) {
    if (method === "eth_requestAccounts") return [wallet];
    if (method === "eth_chainId") return "0x1";
    wrongChainSendCalls += 1;
    return providerHash;
  }
}), /not on BSC chain 56/);
assert.equal(wrongChainSendCalls, 0, "wrong wallet chain is blocked before eth_sendTransaction");

const reportedHashRecord: { txHash?: string } = {};
const reportedHash = `0x${"ab".repeat(32)}`;
assert.equal(bindSettlementTransactionHash(reportedHashRecord, reportedHash), reportedHash, "a valid wallet-reported hash fills a missing broadcaster hash");
assert.equal(reportedHashRecord.txHash, reportedHash, "the accepted external hash is persisted for subsequent reconciliation calls");
assert.equal(bindSettlementTransactionHash({ txHash: reportedHash }, `0x${"AB".repeat(32)}`), reportedHash, "hex casing does not alter hash identity");
assert.throws(() => bindSettlementTransactionHash({ txHash: reportedHash }, mismatchedClosureHash), /does not match the hash returned by the broadcaster/);
assert.throws(() => bindSettlementTransactionHash({}, "0x01"), /valid transaction hash/);

let balanceReadsWhilePreparingPurchase = 0;
const insufficientAllowanceService = new TokenizedStocksService(
  mockClient as any,
  async () => 0n,
  async () => { balanceReadsWhilePreparingPurchase += 1; return 3_000_000_000_000_000_000n; },
  metadataReader,
  undefined,
  undefined,
  undefined,
  async () => 1_000_000_000_000_000n
);
const insufficientAllowance = await insufficientAllowanceService.createBscStockPurchasePlan({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50, maxGasCostBnb: "0.001"
});
assert.equal(insufficientAllowance.status, "awaiting_confirmation", "an allowance prerequisite must not hide a requested purchase plan");
assert.equal(insufficientAllowance.approvalRequired?.spender, spender);
assert.equal(insufficientAllowance.safetyReport?.checks.find((check) => check.name === "authorization_visibility")?.passed, true);
assert.ok(insufficientAllowance.unsignedActions?.length, "the quoted swap plan remains available while the separate approval step is prepared");
assert.equal(balanceReadsWhilePreparingPurchase, 0, "purchase-plan preparation does not read token or native balances to qualify the user");

let swapGasLimitCallsWithoutAllowance = 0;
const allowanceRejectsGasEstimationClient = {
  ...mockClient,
  async post(path: string) {
    if (path.endsWith("/pre-transaction/gas-limit")) {
      swapGasLimitCallsWithoutAllowance += 1;
      throw new Error("BEP20: transfer amount exceeds allowance");
    }
    return mockClient.post(path);
  }
};
const allowanceDoesNotHidePlanService = new TokenizedStocksService(
  allowanceRejectsGasEstimationClient as any, async () => 0n, async () => 0n, metadataReader
);
const planBeforeAllowance = await allowanceDoesNotHidePlanService.createBscStockPurchasePlan({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "10", toAsset: asset, maxSlippageBps: 50
});
assert.equal(planBeforeAllowance.status, "awaiting_confirmation", "the user-requested plan remains visible even when allowance is absent");
assert.equal(planBeforeAllowance.approvalRequired?.requiredAmount, "10000000000000000000");
assert.equal(planBeforeAllowance.estimatedFees?.feeEstimateStatus, "deferred_until_allowance");
assert.equal(swapGasLimitCallsWithoutAllowance, 0, "Ariadne does not run a swap gas-limit simulation that predictably fails before allowance");
assert.equal(planBeforeAllowance.estimatedFees?.estimatedMaxGasCostBnb, undefined, "swap fees are clearly deferred rather than fabricated before allowance");
const allowanceReadFailurePlan = await new TokenizedStocksService(
  allowanceRejectsGasEstimationClient as any,
  async () => { throw new Error("allowance RPC temporarily unavailable"); },
  async () => 0n, metadataReader
).createBscStockPurchasePlan({ walletAddress: wallet, inputTokenSymbol: "USDT", amount: "10", toAsset: asset, maxSlippageBps: 50 });
assert.equal(allowanceReadFailurePlan.status, "awaiting_confirmation", "a temporary allowance-read failure also leaves the requested plan visible");
assert.equal(allowanceReadFailurePlan.authorizationCheck?.reviewedAllowance, undefined, "an unavailable allowance read remains explicitly unverified");
assert.equal(allowanceReadFailurePlan.authorizationCheck?.allowanceReadStatus, "unavailable");
assert.equal(allowanceReadFailurePlan.preparationDiagnostics?.[0]?.stage, "allowance_check", "an unavailable allowance read is identified separately without hiding the plan");
assert.equal(allowanceReadFailurePlan.estimatedFees?.feeEstimateStatus, "deferred_until_allowance");
assert.equal(swapGasLimitCallsWithoutAllowance, 0, "an unverified allowance does not trigger a swap simulation that may be rejected by the provider");

const inputMetadataFailureService = new TokenizedStocksService(
  mockClient as any,
  async () => 0n,
  async () => 0n,
  async (_chainId, tokenAddress) => {
    if (tokenAddress.toLowerCase() === inputAddress.toLowerCase()) throw new Error("fetch failed");
    return metadata(outputAddress, "TESTB", 18);
  }
);
await assert.rejects(
  inputMetadataFailureService.createBscStockPurchasePlan({ walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50 }),
  (error: unknown) => error instanceof PurchasePlanStageError && error.stage === "input_token_verification" && /fetch failed/.test(error.causeMessage),
  "the purchase plan reports a transient metadata failure at the exact input-token verification stage"
);

let allowanceAfterWalletApproval = 0n;
let approvalReceipt: unknown | null = null;
let approvalTransaction: unknown | null = null;
let approvalFinalizedBlock = 0x1000n;
const approvalService = new TokenizedStocksService(
  mockClient as any,
  async () => allowanceAfterWalletApproval,
  async () => 3_000_000_000_000_000_000n,
  metadataReader,
  async () => approvalReceipt,
  async () => approvalTransaction,
  async () => approvalFinalizedBlock,
  async () => 1_000_000_000_000_000n
);
const approvalPlan = await approvalService.prepareBscStockAllowanceApproval({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50
});
assert.equal(approvalPlan.status, "ready_for_wallet_review");
assert.equal(approvalPlan.unsignedTransaction?.to, inputAddress, "allowance calldata targets the USDT token contract");
assert.equal(approvalPlan.unsignedTransaction?.from, wallet);
assert.equal(approvalPlan.unsignedTransaction?.value, "0");
assert.equal(approvalPlan.spender, spender);
assert.equal(approvalPlan.amountBaseUnits, "1000000000000000000");
assert.match(approvalPlan.unsignedTransaction?.data ?? "", /^0x095ea7b3/);
assert.equal(approvalPlan.simulation?.success, true);
assert.equal(approvalPlan.estimatedMaxGasCostBnb, "0.00001");
assert.equal(approvalPlan.maxGasCostBnb, "0.00001", "approval gas cap is proposed from the current provider estimate");
assert.equal(approvalPlan.nativeBalanceBnb, undefined, "approval preparation leaves fee availability to the wallet page");
assert.equal(approvalPlan.unsignedTransaction?.gas, "0x186a0");
assert.equal(approvalPlan.unsignedTransaction?.gasPrice, "0x5f5e100");
assert.equal(approvalPlan.gasBudgetSource, "provider_high_tier_estimate");
const noGasService = new TokenizedStocksService(
  mockClient as any, async () => 0n, async () => 3_000_000_000_000_000_000n, metadataReader,
  undefined, undefined, undefined, async () => 0n
);
const noGasApproval = await noGasService.prepareBscStockAllowanceApproval({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50
});
assert.equal(noGasApproval.status, "ready_for_wallet_review", "the exact allowance page remains available for the owner to inspect the wallet's own fee decision");
assert.equal(noGasApproval.simulation?.success, true, "a zero native balance does not prevent the non-broadcast approval review from being prepared");
let balanceReadsWhilePreparingApproval = 0;
const zeroTokenBalanceApprovalService = new TokenizedStocksService(
  mockClient as any, async () => 0n, async () => { balanceReadsWhilePreparingApproval += 1; return 0n; }, metadataReader,
  undefined, undefined, undefined, async () => 0n
);
const zeroFundsApprovalReview = await zeroTokenBalanceApprovalService.prepareBscStockAllowanceApproval({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50
});
assert.equal(zeroFundsApprovalReview.status, "ready_for_wallet_review", "wallet funds and native gas do not gate the allowance page");
assert.equal(balanceReadsWhilePreparingApproval, 0, "Ariadne does not read wallet token balance to decide whether to open the wallet page");
const fundsOnlyApprovalClient = {
  ...mockClient,
  async post(path: string) {
    if (path.endsWith("/pre-transaction/simulate")) {
      return { code: 0, success: true, data: { status: "FAILED", failReason: "insufficient funds for gas * price + value", balanceChanges: [], allowanceChanges: [] } };
    }
    return mockClient.post(path);
  }
};
const fundsOnlyApprovalService = new TokenizedStocksService(
  fundsOnlyApprovalClient as any, async () => 0n, async () => 0n, metadataReader,
  undefined, undefined, undefined, async () => 0n
);
const fundsOnlyApprovalReview = await fundsOnlyApprovalService.prepareBscStockAllowanceApproval({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50
});
assert.equal(fundsOnlyApprovalReview.status, "ready_for_wallet_review", "a funds-only simulation failure is disclosed but does not block reaching the wallet");
assert.equal(fundsOnlyApprovalReview.simulation?.success, false, "the wallet warning is not mislabeled as a successful simulation");
assert.equal(fundsOnlyApprovalReview.simulation?.walletFundsOnlyFailure, true);
assert.ok(fundsOnlyApprovalReview.simulation?.warnings.some((warning) => /wallet.*funds.*wallet decides/i.test(warning)));

const allowanceGasEstimateRejectedClient = {
  ...mockClient,
  async post(path: string) {
    if (path.endsWith("/pre-transaction/gas-limit")) throw new Error("insufficient funds for gas * price + value");
    return mockClient.post(path);
  },
  async get(path: string, params?: Record<string, string>) {
    if (path.endsWith("/pre-transaction/gas-price")) throw new Error("gas price endpoint unavailable");
    return mockClient.get(path, params);
  }
};
let balanceReadsDuringFeeFallback = 0;
const approvalFeeFallbackService = new TokenizedStocksService(
  allowanceGasEstimateRejectedClient as any, async () => 0n,
  async () => { balanceReadsDuringFeeFallback += 1; return 0n; }, metadataReader,
  undefined, undefined, undefined, async () => 0n
);
const feeFallbackApprovalReview = await approvalFeeFallbackService.prepareBscStockAllowanceApproval({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50
});
assert.equal(feeFallbackApprovalReview.status, "ready_for_wallet_review", "provider gas-limit and gas-price failures do not stop the exact allowance from reaching wallet review when the builder supplied both fee fields");
assert.equal(feeFallbackApprovalReview.estimatedMaxGasCostBnb, "0.000007", "the allowance builder gas limit/price are used as the disclosed fee estimate when both estimator endpoints fail");
assert.equal(balanceReadsDuringFeeFallback, 0, "fee fallback does not inspect token or native wallet balances");
const pendingApproval = await approvalService.refreshBscPurchaseAfterApproval({ approvalPlan, txHash: `0x${"cd".repeat(32)}` });
assert.equal(pendingApproval.status, "pending", "an absent receipt never counts as approval completion");
const approvalHash = `0x${"cd".repeat(32)}`;
approvalReceipt = { transactionHash: approvalHash, from: wallet, blockNumber: "0x20", status: "0x1" };
approvalTransaction = { from: wallet, to: inputAddress, input: approvalPlan.unsignedTransaction!.data, value: "0x0", gas: "0x186a0", gasPrice: "0x5f5e100" };
approvalFinalizedBlock = 0x1fn;
const unfinalizedApproval = await approvalService.refreshBscPurchaseAfterApproval({ approvalPlan, txHash: approvalHash });
assert.equal(unfinalizedApproval.status, "pending", "an included but not finalized allowance receipt cannot trigger a swap quote");
assert.match(unfinalizedApproval.reason ?? "", /not finalized yet/);
allowanceAfterWalletApproval = 1_000_000_000_000_000_000n;
approvalFinalizedBlock = 0x1000n;
const refreshed = await approvalService.refreshBscPurchaseAfterApproval({ approvalPlan, txHash: approvalHash });
assert.equal(refreshed.status, "ready");
assert.equal(refreshed.allowance, "1000000000000000000");
assert.equal(refreshed.balance, "3000000000000000000");
assert.equal(refreshed.plan?.status, "awaiting_confirmation");
assert.equal(refreshed.plan?.quoteId, "closure-test-quote", "approval completion fetches a fresh quote-backed swap plan");
const balanceRpcFailureService = new TokenizedStocksService(
  mockClient as any, async () => allowanceAfterWalletApproval,
  async () => { throw new Error("BSC balance RPC unavailable"); }, metadataReader,
  async () => approvalReceipt, async () => approvalTransaction,
  async () => approvalFinalizedBlock, async () => 1_000_000_000_000_000n
);
const refreshedWithoutBalanceContext = await balanceRpcFailureService.refreshBscPurchaseAfterApproval({ approvalPlan, txHash: approvalHash });
assert.equal(refreshedWithoutBalanceContext.status, "ready", "a balance read failure does not prevent the fresh post-approval plan");
assert.equal(refreshedWithoutBalanceContext.balance, undefined);
assert.match(refreshedWithoutBalanceContext.balanceReadWarning ?? "", /did not block the fresh purchase plan/);
const originalDateNow = Date.now;
Date.now = () => approvalPlan.expiresAt + 1;
try {
  const expiredApproval = await approvalService.refreshBscPurchaseAfterApproval({ approvalPlan, txHash: approvalHash });
  assert.equal(expiredApproval.status, "blocked");
  assert.match(expiredApproval.reason ?? "", /review window has expired/);
} finally {
  Date.now = originalDateNow;
}
const tamperedApprovalPlan = { ...approvalPlan, spender: router };
assert.equal((await approvalService.refreshBscPurchaseAfterApproval({ approvalPlan: tamperedApprovalPlan, txHash: approvalHash })).status, "blocked");

const inputToken = metadata(inputAddress, "USDT", 18);
const outputToken = metadata(outputAddress, "TESTB", 18);
const txHash = `0x${"ab".repeat(32)}`;
const confirmedReceipt = { transactionHash: txHash, from: wallet, blockNumber: "0x10", status: "0x1" };
let inputBalance = 10_000_000_000_000_000_000n;
let outputBalance = 0n;
let receiptReads = 0;
const settlementService = new SettlementReconciler({
  async erc20Balance(_chainId, tokenAddress) { return tokenAddress === inputAddress ? inputBalance : outputBalance; },
  async transactionReceipt() {
    receiptReads += 1;
    if (receiptReads === 1) return null;
    inputBalance = 9_000_000_000_000_000_000n;
    outputBalance = 995_000_000_000_000_000n;
    return confirmedReceipt;
  },
  async latestFinalizedBlockNumber() { return 0x1000n; }
}, async () => {});
const before = await settlementService.captureBefore({ chainId: "56", walletAddress: wallet, inputToken, outputToken });
const settled = await settlementService.reconcile({ txHash, before, expectedInputSpent: "1000000000000000000", minimumOutputReceived: "995000000000000000", maxPollAttempts: 3, pollIntervalMs: 0 });
assert.equal(settled.status, "confirmed");
assert.equal(settled.success, true);
assert.deepEqual(settled.changes, {
  inputSpent: "1000000000000000000", outputReceived: "995000000000000000", inputSpentDisplay: "1", outputReceivedDisplay: "0.995"
});

let postReceiptBalanceReads = 0;
const unfinalizedService = new SettlementReconciler({
  async erc20Balance() { postReceiptBalanceReads += 1; return 0n; },
  async transactionReceipt() { return confirmedReceipt; },
  async latestFinalizedBlockNumber() { return 0x0fn; }
}, async () => {});
const unfinalized = await unfinalizedService.reconcile({ txHash, before, expectedInputSpent: "1000000000000000000", minimumOutputReceived: "995000000000000000", maxPollAttempts: 1, pollIntervalMs: 0 });
assert.equal(unfinalized.status, "pending", "a successful receipt must remain pending until its block is reported finalized");
assert.equal(unfinalized.success, false);
assert.match(unfinalized.mismatches.join(" "), /not finalized yet/);
assert.equal(postReceiptBalanceReads, 0, "post-transaction balances are not treated as settlement evidence before finality");

const unavailableFinalityService = new SettlementReconciler({
  async erc20Balance() { postReceiptBalanceReads += 1; return 0n; },
  async transactionReceipt() { return confirmedReceipt; },
  async latestFinalizedBlockNumber() { throw new Error("finality RPC unavailable"); }
}, async () => {});
const unavailableFinality = await unavailableFinalityService.reconcile({ txHash, before, expectedInputSpent: "1000000000000000000", minimumOutputReceived: "995000000000000000", maxPollAttempts: 1, pollIntervalMs: 0 });
assert.equal(unavailableFinality.status, "pending", "missing finality evidence must remain pending");
assert.equal(unavailableFinality.success, false);
assert.match(unavailableFinality.mismatches.join(" "), /Could not verify BSC finality.*finality RPC unavailable/);
assert.equal(postReceiptBalanceReads, 0, "balance deltas are not read when BSC finality cannot be verified");

const mismatchService = new SettlementReconciler({
  async erc20Balance(_chainId, tokenAddress) { return tokenAddress === inputAddress ? 9_000_000_000_000_000_000n : 990_000_000_000_000_000n; },
  async transactionReceipt() { return confirmedReceipt; },
  async latestFinalizedBlockNumber() { return 0x1000n; }
});
const mismatch = await mismatchService.reconcile({ txHash, before, expectedInputSpent: "1000000000000000000", minimumOutputReceived: "995000000000000000", maxPollAttempts: 1, pollIntervalMs: 0 });
assert.equal(mismatch.status, "balance_mismatch");
assert.equal(mismatch.success, false);
assert.match(mismatch.mismatches.join(" "), /below reviewed minimum/);

const pendingService = new SettlementReconciler({
  async erc20Balance() { return 0n; },
  async transactionReceipt() { return null; },
  async latestFinalizedBlockNumber() { return 0x1000n; }
}, async () => {});
const pending = await pendingService.reconcile({ txHash, before, expectedInputSpent: "1000000000000000000", minimumOutputReceived: "995000000000000000", maxPollAttempts: 2, pollIntervalMs: 0 });
assert.equal(pending.status, "pending");
assert.equal(pending.success, false);
assert.equal(pending.pollAttempts, 2);

const revertedService = new SettlementReconciler({
  async erc20Balance() { return 0n; },
  async transactionReceipt() { return { ...confirmedReceipt, status: "0x0" }; },
  async latestFinalizedBlockNumber() { return 0x1000n; }
});
const reverted = await revertedService.reconcile({ txHash, before, expectedInputSpent: "1000000000000000000", minimumOutputReceived: "995000000000000000", maxPollAttempts: 1, pollIntervalMs: 0 });
assert.equal(reverted.status, "reverted");
assert.equal(reverted.success, false);

const multiRouteClient = {
  ...mockClient,
  async get(path: string, params?: Record<string, string>) {
    const response = await mockClient.get(path, params);
    if (path.endsWith("/aggregator/quote")) {
      const quoteResponse = response as any;
      return { ...quoteResponse, data: [...quoteResponse.data, { ...quoteResponse.data[0], quoteId: "ambiguous-second-route", executionMode: "RFQ" }] };
    }
    return response;
  }
};
const multiRouteService = new TokenizedStocksService(
  multiRouteClient as any,
  async () => 2_000_000_000_000_000_000n,
  async () => 3_000_000_000_000_000_000n,
  metadataReader
);
const ambiguousRoutePlan = await multiRouteService.createBscStockPurchasePlan({
  walletAddress: wallet, inputTokenSymbol: "USDT", amount: "1", toAsset: asset, maxSlippageBps: 50, maxGasCostBnb: "0.001"
});
assert.equal(ambiguousRoutePlan.status, "failed", "a multi-route quote must not silently select its first entry");
assert.match(ambiguousRoutePlan.safetyReport?.blockingReasons.join(" ") ?? "", /multiple quote routes/);
assert.equal(ambiguousRoutePlan.unsignedActions, undefined);

const mismatchedExecutionModeClient = {
  ...mockClient,
  async get(path: string, params?: Record<string, string>) {
    const response = await mockClient.get(path, params) as any;
    if (path.endsWith("/aggregator/quote")) {
      return { ...response, data: response.data.map((route: any) => ({ ...route, executionMode: "SWAP" })) };
    }
    if (path.endsWith("/aggregator/swap")) {
      return { ...response, data: { executionMode: "RFQ", rfq: { typedDataToSign: "0x1234", vendor: "CowSwap", orderId: "rfq-test" } } };
    }
    return response;
  }
};
const mismatchedModeService = new TokenizedStocksService(
  mismatchedExecutionModeClient as any,
  async () => 2_000_000_000_000_000_000n,
  async () => 3_000_000_000_000_000_000n,
  metadataReader
);
const mismatchedModeIntent = {
  type: "buy" as const, walletAddress: wallet, fromTokenAddress: inputAddress, amount: "1", amountDecimals: 18,
  maxSlippageBps: 50, toAsset: asset
};
const mismatchedModeQuote = await mismatchedModeService.quote(mismatchedModeIntent);
await assert.rejects(
  mismatchedModeService.buildUnsignedAction(mismatchedModeIntent, mismatchedModeQuote),
  /Quote\/build execution mode mismatch: quote=SWAP, build=RFQ/
);

console.log(JSON.stringify({
  liveChainUsed: false,
  realWalletUsed: false,
  broadcastRequests: 0,
  verified: ["BSC USDT allowlist and on-chain identity contract (fixture)", "issuer token metadata contract (fixture)", "input decimals from metadata", "minimum output integer arithmetic", "gas high-tier estimate and budget bound", "wallet funds do not block plan preparation", "insufficient allowance is disclosed as a separate approval prerequisite", "separate exact-amount approval transaction and non-broadcast simulation", "approval receipt transaction calldata/sender and live allowance recheck only after BSC finality (fixture)", "unfinalized approval receipt remains pending and does not trigger a fresh swap quote", "expired approval review window blocks refresh", "fresh quote-backed swap plan after approval finality", "ambiguous multi-route quote fails closed", "broadcaster transaction hash cannot be replaced during SDK reconciliation", "external transaction hash is validated and bound when the broadcaster returned none", "EIP-1193 account and BSC-chain checks before wallet prompt", "wallet-native eth_sendTransaction request contains exact plan fields and reviewed gas parameters", "wallet-returned hash, on-chain transaction fields, receipt and exact balance deltas reconcile", "over-budget wallet transaction is marked balance_mismatch before receipt/balance success", "wrong connected account and wrong chain are blocked before eth_sendTransaction", "BSC settlement remains pending until receipt block is finalized; missing finality evidence never triggers balance reconciliation", "confirmed swap receipt plus exact input and minimum output deltas (fixture)"],
  explicitNonSuccessStates: ["pending, including receipt not yet available or finality evidence unavailable", "reverted", "balance_mismatch"],
  passed: true
}, null, 2));
