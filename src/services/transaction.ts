import { BinanceWeb3Client } from "../binance-web3-client.js";
import { normalizeSimulation } from "../domain/normalizers.js";
import type { SimulationResult } from "../domain/types.js";
import { ProxyAgent, fetch } from "undici";

export type EvmTransaction = {
  from: string;
  to: string;
  value: string;
  data?: string;
};

export class TransactionService {
  constructor(private readonly client: BinanceWeb3Client) {}

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
    if (!payload.result || !/^0x[0-9a-f]+$/i.test(payload.result)) throw new Error("EVM RPC returned an invalid allowance result");
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
