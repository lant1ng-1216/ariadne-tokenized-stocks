import { BinanceWeb3Client } from "../binance-web3-client.js";
import { normalizeSimulation } from "../domain/normalizers.js";
import type { SimulationResult } from "../domain/types.js";
import { ProxyAgent, fetch } from "undici";
import type { VerifiedTokenIdentity } from "../domain/types.js";
import { formatTokenAmount } from "../domain/amount.js";

export type EvmTransaction = {
  from: string;
  to: string;
  value: string;
  data?: string;
  gas?: string;
  gasLimit?: string;
  gasPrice?: string;
};

export type EvmFeeEstimate = {
  gasLimit: string;
  highGasPriceWei: string;
  estimatedMaxGasCostBnb: string;
};

export class BscRpcRequestError extends Error {
  constructor(
    readonly method: string,
    readonly retryable: boolean,
    readonly attempts: number,
    readonly status?: number,
    readonly causeMessage?: string
  ) {
    super(`BSC RPC ${method} request failed${status ? ` with HTTP ${status}` : ""}${causeMessage ? `: ${causeMessage}` : ""}`);
    this.name = "BscRpcRequestError";
  }
}

function isTransientRpcTransportError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  if (/fetch failed|socket hang up|connection reset|timed? ?out|network error/i.test(error.message)) return true;
  let cause: unknown = (error as Error & { cause?: unknown }).cause;
  for (let depth = 0; depth < 2 && cause && typeof cause === "object"; depth += 1) {
    const code = "code" in cause ? String((cause as { code: unknown }).code) : "";
    if (/^(?:UND_ERR_|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENETUNREACH)/.test(code)) return true;
    cause = "cause" in cause ? (cause as { cause?: unknown }).cause : undefined;
  }
  return false;
}

function decodeAbiString(value: string): string {
  if (!/^0x(?:[0-9a-fA-F]{2})+$/.test(value)) throw new Error("EVM RPC returned invalid ERC-20 string data");
  const body = value.slice(2);
  if (body.length === 64) {
    const bytes = Buffer.from(body, "hex");
    const zero = bytes.indexOf(0);
    return bytes.subarray(0, zero < 0 ? bytes.length : zero).toString("utf8");
  }
  if (body.length < 128) throw new Error("EVM RPC returned truncated ERC-20 string data");
  const offset = Number(BigInt(`0x${body.slice(0, 64)}`)) * 2;
  if (!Number.isSafeInteger(offset) || offset < 64 || offset + 64 > body.length) throw new Error("EVM RPC returned an invalid ERC-20 string offset");
  const length = Number(BigInt(`0x${body.slice(offset, offset + 64)}`));
  const start = offset + 64;
  if (!Number.isSafeInteger(length) || length < 1 || length > 128 || start + length * 2 > body.length) throw new Error("EVM RPC returned an invalid ERC-20 string length");
  return Buffer.from(body.slice(start, start + length * 2), "hex").toString("utf8");
}

export class TransactionService {
  constructor(private readonly client: BinanceWeb3Client) {}

  /** Read and verify basic ERC-20 identity directly from BSC, without trusting a caller-supplied decimal count. */
  async erc20TokenMetadata(chainId: string, tokenAddress: string, rpcUrl = process.env.BINANCE_WEB3_EVM_RPC_URL ?? "https://bsc-dataseed.binance.org"): Promise<VerifiedTokenIdentity> {
    if (chainId !== "56") throw new Error(`No default EVM RPC configured for chain ${chainId}`);
    if (!/^0x[0-9a-fA-F]{40}$/.test(tokenAddress)) throw new Error("ERC-20 metadata requires a valid token contract address");
    const dispatcher = process.env.BINANCE_WEB3_PROXY_URL ? new ProxyAgent(process.env.BINANCE_WEB3_PROXY_URL) : undefined;
    const request = async (method: string, params: unknown[]): Promise<unknown> => {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await fetch(rpcUrl, {
            method: "POST",
            dispatcher,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
            signal: AbortSignal.timeout(8_000)
          });
          if (!response.ok) {
            const retryable = response.status === 429 || response.status >= 500;
            if (retryable && attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** (attempt - 1)));
              continue;
            }
            throw new BscRpcRequestError(method, retryable, attempt, response.status);
          }
          let payload: { result?: unknown; error?: { message?: string } };
          try {
            payload = await response.json() as { result?: unknown; error?: { message?: string } };
          } catch (error) {
            throw new BscRpcRequestError(method, false, attempt, response.status, error instanceof Error ? "invalid JSON response" : "invalid response");
          }
          if (payload.error) throw new BscRpcRequestError(method, false, attempt, response.status, payload.error.message ?? "JSON-RPC error");
          return payload.result;
        } catch (error) {
          if (error instanceof BscRpcRequestError) throw error;
          const retryable = isTransientRpcTransportError(error);
          const causeMessage = error instanceof Error ? error.message : String(error);
          if (retryable && attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** (attempt - 1)));
            continue;
          }
          throw new BscRpcRequestError(method, retryable, attempt, undefined, causeMessage);
        }
      }
      throw new BscRpcRequestError(method, false, maxAttempts);
    };
    const [rpcChainId, code, symbolResult, decimalsResult, nameResult] = await Promise.all([
      request("eth_chainId", []),
      request("eth_getCode", [tokenAddress, "latest"]),
      request("eth_call", [{ to: tokenAddress, data: "0x95d89b41" }, "latest"]),
      request("eth_call", [{ to: tokenAddress, data: "0x313ce567" }, "latest"]),
      request("eth_call", [{ to: tokenAddress, data: "0x06fdde03" }, "latest"]).catch(() => undefined)
    ]);
    if (rpcChainId !== "0x38") throw new Error(`Configured EVM RPC is on ${String(rpcChainId)}, not BSC chain 56`);
    if (typeof code !== "string" || !/^0x[0-9a-fA-F]+$/.test(code) || /^0x0*$/i.test(code)) throw new Error("Token address has no deployed contract code on BSC");
    if (typeof symbolResult !== "string") throw new Error("EVM RPC returned no ERC-20 symbol");
    if (typeof decimalsResult !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(decimalsResult)) throw new Error("EVM RPC returned invalid ERC-20 decimals");
    const symbol = decodeAbiString(symbolResult).trim();
    const decimalsValue = BigInt(decimalsResult);
    if (!symbol || symbol.length > 32 || decimalsValue > 36n) throw new Error("On-chain ERC-20 identity is outside supported bounds");
    const name = typeof nameResult === "string" ? decodeAbiString(nameResult).trim() : "";
    return {
      chainId,
      contractAddress: tokenAddress,
      symbol,
      ...(name ? { name } : {}),
      decimals: Number(decimalsValue),
      verifiedAt: Date.now(),
      verificationSource: "bsc-eth-call"
    };
  }

  /** Read-only receipt lookup; a null result remains pending, never success. */
  async transactionReceipt(chainId: string, txHash: string, rpcUrl = process.env.BINANCE_WEB3_EVM_RPC_URL ?? "https://bsc-dataseed.binance.org"): Promise<unknown | null> {
    if (chainId !== "56") throw new Error(`No default EVM RPC configured for chain ${chainId}`);
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("Transaction receipt lookup requires a valid transaction hash");
    const response = await fetch(rpcUrl, {
      method: "POST",
      dispatcher: process.env.BINANCE_WEB3_PROXY_URL ? new ProxyAgent(process.env.BINANCE_WEB3_PROXY_URL) : undefined,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash] })
    });
    if (!response.ok) throw new Error(`EVM RPC receipt request failed: HTTP ${response.status}`);
    const payload = await response.json() as { result?: unknown; error?: { message?: string } };
    if (payload.error) throw new Error(`EVM RPC receipt request failed: ${payload.error.message ?? "unknown error"}`);
    if (payload.result === null || payload.result === undefined) return null;
    if (typeof payload.result !== "object" || Array.isArray(payload.result)) throw new Error("EVM RPC returned an invalid transaction receipt");
    return payload.result;
  }

  /** Read the current BSC finalized block; a mined receipt is not called settled before this block includes it. */
  async latestFinalizedBlockNumber(chainId: string, rpcUrl = process.env.BINANCE_WEB3_EVM_RPC_URL ?? "https://bsc-dataseed.binance.org"): Promise<bigint> {
    if (chainId !== "56") throw new Error(`No default EVM RPC configured for chain ${chainId}`);
    const response = await fetch(rpcUrl, {
      method: "POST",
      dispatcher: process.env.BINANCE_WEB3_PROXY_URL ? new ProxyAgent(process.env.BINANCE_WEB3_PROXY_URL) : undefined,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["finalized", false] })
    });
    if (!response.ok) throw new Error(`EVM RPC finalized-block request failed: HTTP ${response.status}`);
    const payload = await response.json() as { result?: unknown; error?: { message?: string } };
    if (payload.error) throw new Error(`EVM RPC finalized-block request failed: ${payload.error.message ?? "unknown error"}`);
    if (!payload.result || typeof payload.result !== "object" || Array.isArray(payload.result)) {
      throw new Error("BSC RPC did not return a finalized block");
    }
    const number = (payload.result as Record<string, unknown>).number;
    if (typeof number !== "string" || !/^0x[0-9a-fA-F]+$/.test(number)) {
      throw new Error("BSC RPC returned an invalid finalized block number");
    }
    return BigInt(number);
  }

  /** Read-only transaction lookup used to bind a wallet-confirmed allowance receipt to its exact calldata. */
  async transactionByHash(chainId: string, txHash: string, rpcUrl = process.env.BINANCE_WEB3_EVM_RPC_URL ?? "https://bsc-dataseed.binance.org"): Promise<unknown | null> {
    if (chainId !== "56") throw new Error(`No default EVM RPC configured for chain ${chainId}`);
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("Transaction lookup requires a valid transaction hash");
    const response = await fetch(rpcUrl, {
      method: "POST",
      dispatcher: process.env.BINANCE_WEB3_PROXY_URL ? new ProxyAgent(process.env.BINANCE_WEB3_PROXY_URL) : undefined,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [txHash] })
    });
    if (!response.ok) throw new Error(`EVM RPC transaction request failed: HTTP ${response.status}`);
    const payload = await response.json() as { result?: unknown; error?: { message?: string } };
    if (payload.error) throw new Error(`EVM RPC transaction request failed: ${payload.error.message ?? "unknown error"}`);
    if (payload.result === null || payload.result === undefined) return null;
    if (typeof payload.result !== "object" || Array.isArray(payload.result)) throw new Error("EVM RPC returned an invalid transaction");
    return payload.result;
  }

  async supportedChains(): Promise<unknown[]> {
    const response = await this.client.get<any>("/api/v1/dex/pre-transaction/supported/chain");
    return response.data ?? [];
  }

  async gasPrice(chainId: string): Promise<unknown> {
    const response = await this.client.get<any>("/api/v1/dex/pre-transaction/gas-price", { binanceChainId: chainId });
    return response.data;
  }

  async latestBlockHeight(chainId: string): Promise<unknown> {
    const response = await this.client.get<any>("/api/v1/dex/pre-transaction/block-height", { binanceChainId: chainId });
    return response.data;
  }

  async gasLimit(chainId: string, evmTx: EvmTransaction): Promise<unknown> {
    const response = await this.client.post<any>("/api/v1/dex/pre-transaction/gas-limit", { binanceChainId: chainId, evmTx });
    return response.data;
  }

  /** Estimate worst-tier BSC native gas cost from the provider's transaction gas limit and fee quote. */
  async estimateBscEvmCost(chainId: string, evmTx: EvmTransaction): Promise<EvmFeeEstimate> {
    if (chainId !== "56") throw new Error(`No BSC fee estimator configured for chain ${chainId}`);
    const parseQuantity = (value: unknown): string | undefined => {
      if (typeof value !== "string" || !/^(?:0x[0-9a-fA-F]+|\d+)$/.test(value)) return undefined;
      try {
        const parsed = BigInt(value);
        return parsed > 0n ? parsed.toString() : undefined;
      } catch { return undefined; }
    };
    const [limitResult, priceResult] = await Promise.allSettled([this.gasLimit(chainId, evmTx), this.gasPrice(chainId)]);
    const rawLimit = limitResult.status === "fulfilled" ? limitResult.value : undefined;
    const rawPrice = priceResult.status === "fulfilled" ? priceResult.value : undefined;
    const limitRecord = rawLimit && typeof rawLimit === "object" ? rawLimit as Record<string, unknown> : {};
    const priceRecord = rawPrice && typeof rawPrice === "object" ? rawPrice as Record<string, unknown> : {};
    const evmPrices = priceRecord.evmLegacyGasPrice && typeof priceRecord.evmLegacyGasPrice === "object"
      ? priceRecord.evmLegacyGasPrice as Record<string, unknown>
      : {};
    // A provider-built transaction may carry a usable gas limit/price already. Use
    // those exact request fields if estimation endpoints reject them because the
    // current wallet state (for example, missing allowance or gas funds) prevents
    // simulation. This estimates fees; it does not inspect wallet balances.
    const gasLimit = parseQuantity(limitRecord.gasLimit) ?? parseQuantity(evmTx.gasLimit) ?? parseQuantity(evmTx.gas);
    const highGasPrice = parseQuantity(evmPrices.highGasPrice) ?? parseQuantity(evmTx.gasPrice);
    if (!gasLimit || !highGasPrice) {
      const failedPart = !gasLimit && limitResult.status === "rejected"
        ? ` gas-limit request failed: ${limitResult.reason instanceof Error ? limitResult.reason.message : String(limitResult.reason)}.`
        : "";
      const failedPrice = !highGasPrice && priceResult.status === "rejected"
        ? ` gas-price request failed: ${priceResult.reason instanceof Error ? priceResult.reason.message : String(priceResult.reason)}.`
        : "";
      throw new Error(`BSC provider did not return a usable gas limit and fee price.${failedPart}${failedPrice}`);
    }
    const estimatedMaxGasCostBnb = formatTokenAmount((BigInt(gasLimit) * BigInt(highGasPrice)).toString(), 18);
    return { gasLimit, highGasPriceWei: highGasPrice, estimatedMaxGasCostBnb };
  }

  async transactionsByAddress(address: string, chains: string[], options: { limit?: number; cursor?: string } = {}): Promise<unknown> {
    const response = await this.client.get<any>("/api/v1/dex/post-transaction/transactions-by-address", {
      address,
      chains: chains.join(","),
      limit: String(options.limit ?? 20),
      ...(options.cursor ? { cursor: options.cursor } : {})
    });
    return response.data ?? [];
  }

  async transactionDetail(chainId: string, txHash: string): Promise<unknown[]> {
    const response = await this.client.get<any>("/api/v1/dex/post-transaction/transaction-detail-by-txhash", { binanceChainId: chainId, txHash });
    return response.data ?? [];
  }

  /** Read-only ERC-20 allowance check through an EVM JSON-RPC endpoint. */
  async erc20Allowance(chainId: string, tokenAddress: string, owner: string, spender: string, rpcUrl = process.env.BINANCE_WEB3_EVM_RPC_URL ?? "https://bsc-dataseed.binance.org"): Promise<bigint> {
    if (chainId !== "56") throw new Error(`No default EVM RPC configured for chain ${chainId}`);
    const word = (address: string) => address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
    const response = await fetch(rpcUrl, {
      method: "POST",
      dispatcher: process.env.BINANCE_WEB3_PROXY_URL ? new ProxyAgent(process.env.BINANCE_WEB3_PROXY_URL) : undefined,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: tokenAddress, data: `0xdd62ed3e${word(owner)}${word(spender)}` }, "latest"] })
    });
    if (!response.ok) throw new Error(`EVM RPC allowance request failed: HTTP ${response.status}`);
    const payload = await response.json() as { result?: string; error?: { message?: string } };
    if (payload.error) throw new Error(`EVM RPC allowance request failed: ${payload.error.message ?? "unknown error"}`);
    if (!payload.result || !/^0x[0-9a-fA-F]{64}$/.test(payload.result)) throw new Error("EVM RPC returned an invalid allowance result");
    return BigInt(payload.result);
  }

  /** Read-only raw ERC-20 balance. Missing or malformed RPC data is never treated as zero. */
  async erc20Balance(chainId: string, tokenAddress: string, owner: string, rpcUrl = process.env.BINANCE_WEB3_EVM_RPC_URL ?? "https://bsc-dataseed.binance.org"): Promise<bigint> {
    if (chainId !== "56") throw new Error(`No default EVM RPC configured for chain ${chainId}`);
    if (!/^0x[0-9a-fA-F]{40}$/.test(tokenAddress) || !/^0x[0-9a-fA-F]{40}$/.test(owner)) throw new Error("ERC-20 balance requires valid token and wallet addresses");
    const ownerWord = owner.slice(2).toLowerCase().padStart(64, "0");
    const response = await fetch(rpcUrl, {
      method: "POST",
      dispatcher: process.env.BINANCE_WEB3_PROXY_URL ? new ProxyAgent(process.env.BINANCE_WEB3_PROXY_URL) : undefined,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: tokenAddress, data: `0x70a08231${ownerWord}` }, "latest"] })
    });
    if (!response.ok) throw new Error(`EVM RPC balance request failed: HTTP ${response.status}`);
    const payload = await response.json() as { result?: string; error?: { message?: string } };
    if (payload.error) throw new Error(`EVM RPC balance request failed: ${payload.error.message ?? "unknown error"}`);
    if (!payload.result || !/^0x[0-9a-fA-F]{64}$/.test(payload.result)) throw new Error("EVM RPC returned an invalid ERC-20 balance result");
    return BigInt(payload.result);
  }

  /** Read-only native BNB balance; never infers a missing RPC result as zero. */
  async nativeBalance(chainId: string, owner: string, rpcUrl = process.env.BINANCE_WEB3_EVM_RPC_URL ?? "https://bsc-dataseed.binance.org"): Promise<bigint> {
    if (chainId !== "56") throw new Error(`No default EVM RPC configured for chain ${chainId}`);
    if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) throw new Error("Native balance requires a valid wallet address");
    const response = await fetch(rpcUrl, {
      method: "POST",
      dispatcher: process.env.BINANCE_WEB3_PROXY_URL ? new ProxyAgent(process.env.BINANCE_WEB3_PROXY_URL) : undefined,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [owner, "latest"] })
    });
    if (!response.ok) throw new Error(`EVM RPC native balance request failed: HTTP ${response.status}`);
    const payload = await response.json() as { result?: string; error?: { message?: string } };
    if (payload.error) throw new Error(`EVM RPC native balance request failed: ${payload.error.message ?? "unknown error"}`);
    if (!payload.result || !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(payload.result)) throw new Error("EVM RPC returned an invalid native balance result");
    return BigInt(payload.result);
  }

  async simulateEvm(chainId: string, evmTx: EvmTransaction): Promise<SimulationResult> {
    const response = await this.client.post<any>("/api/v1/dex/pre-transaction/simulate", {
      binanceChainId: chainId,
      evmTx
    });
    const result = normalizeSimulation(response);
    if (response.data?.failReason) result.warnings.push(response.data.failReason);
    return result;
  }

  /**
   * Low-level broadcast primitive. Callers must validate the signed payload against
   * the reviewed plan, fee/balance limits and replay state before invoking it.
   */
  async broadcastSigned(chainId: string, signedTransaction: string, address: string, enableMevProtection = false): Promise<unknown> {
    const response = await this.client.post<any>("/api/v1/dex/pre-transaction/broadcast-transaction", {
      binanceChainId: chainId,
      signedTransaction,
      address,
      enableMevProtection
    });
    return response.data;
  }

  async broadcastOrders(address: string, chainId: string, options: { orderId?: string; txStatus?: string; cursor?: string; limit?: number } = {}): Promise<unknown> {
    const response = await this.client.get<any>("/api/v1/dex/post-transaction/orders", {
      address,
      binanceChainId: chainId,
      ...(options.orderId ? { orderId: options.orderId } : {}),
      ...(options.txStatus ? { txStatus: options.txStatus } : {}),
      ...(options.cursor ? { cursor: options.cursor } : {}),
      limit: String(options.limit ?? 20)
    });
    return response.data;
  }
}
