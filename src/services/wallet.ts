import { BinanceWeb3Client } from "../binance-web3-client.js";
import { normalizeWalletHolding } from "../domain/normalizers.js";
import type { StockAsset, WalletHolding } from "../domain/types.js";

export class WalletService {
  constructor(private readonly client: BinanceWeb3Client) {}

  async supportedChains(chainId?: string): Promise<unknown[]> {
    const response = await this.client.get<any>("/api/v1/dex/balance/supported/chain", chainId ? { binanceChainId: chainId } : {});
    return response.data ?? [];
  }

  async holdings(address: string, chainIds: string[], options: { excludeRiskToken?: boolean; page?: number; pageSize?: number } = {}): Promise<WalletHolding[]> {
    const response = await this.client.get<any>("/api/v1/dex/balance/all-token-balances-by-address", {
      address,
      chains: chainIds.join(","),
      excludeRiskToken: String(options.excludeRiskToken ?? true),
      page: String(options.page ?? 1),
      pageSize: String(options.pageSize ?? 100)
    });
    const rows = Array.isArray(response.data)
      ? response.data.flatMap((group: any) => Array.isArray(group?.tokenAssets) ? group.tokenAssets : [group])
      : response.data?.balances ?? [];
    return rows.map((row: any) => normalizeWalletHolding(row));
  }

  async holdingsForAssets(address: string, assets: StockAsset[]): Promise<WalletHolding[]> {
    const holdings = await this.holdings(address, [...new Set(assets.map((asset) => asset.chainId))]);
    return holdings.map((holding) => ({
      ...holding,
      asset: assets.find((asset) => asset.chainId === holding.chainId && asset.contractAddress.toLowerCase() === holding.contractAddress.toLowerCase())
    }));
  }
}
