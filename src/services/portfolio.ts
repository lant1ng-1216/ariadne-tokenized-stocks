import { BinanceWeb3Client } from "../binance-web3-client.js";

export class PortfolioService {
  constructor(private readonly client: BinanceWeb3Client) {}

  async overview(chainId: string, walletAddress: string, timeFrame: 1 | 2 | 3 | 4 = 1): Promise<unknown> {
    const response = await this.client.get<any>("/api/v1/dex/market/portfolio/overview", {
      binanceChainId: chainId,
      walletAddress,
      timeFrame: String(timeFrame)
    });
    return response.data;
  }
}
