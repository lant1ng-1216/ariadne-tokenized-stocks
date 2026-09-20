import { BinanceWeb3Client } from "../binance-web3-client.js";

export class DefiService {
  constructor(private readonly client: BinanceWeb3Client) {}

  async protocols(chainId: string, page = 1, size = 20): Promise<unknown> {
    const response = await this.client.post<any>("/api/v1/defi/data/protocol/list", { binanceChainId: chainId, page, size });
    return response.data;
  }

  async investments(chainId: string, investType?: string, page = 1, size = 20): Promise<unknown> {
    const response = await this.client.post<any>("/api/v1/defi/data/investment/list", { binanceChainId: chainId, ...(investType ? { investType } : {}), page, size });
    return response.data;
  }

  async investmentDetail(chainId: string, investmentId: string): Promise<unknown> {
    const response = await this.client.post<any>("/api/v1/defi/data/investment/detail", {
      binanceChainId: chainId,
      investmentId
    });
    return response.data;
  }

  async positions(addresses: string[], chainIds: string[]): Promise<unknown> {
    const response = await this.client.post<any>("/api/v1/defi/data/position/list", { addresses, binanceChainIds: chainIds });
    return response.data;
  }
}
