import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { WalletService } from "../src/services/wallet.js";
import { PortfolioService } from "../src/services/portfolio.js";
import { DefiService } from "../src/services/defi.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const client = new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL });
const zero = "0x0000000000000000000000000000000000000000";
const wallet = new WalletService(client);
const portfolio = new PortfolioService(client);
const defi = new DefiService(client);

const [chains, holdings, overview, protocols, investments, positions] = await Promise.all([
  wallet.supportedChains("56"),
  wallet.holdings(zero, ["56"], { pageSize: 20 }),
  portfolio.overview("56", zero, 1),
  defi.protocols("56"),
  defi.investments("56", "Earn", 1, 20),
  defi.positions([zero], ["56"]).catch((error) => ({ blocked: true, error: String(error) }))
]);
const investmentList = Array.isArray(investments) ? investments[0]?.list : (investments as any)?.list;
const investmentDetail = investmentList?.[0]
  ? await defi.investmentDetail("56", investmentList[0].investmentId)
  : null;
console.log(JSON.stringify({
  walletSupportedChains: { count: chains.length },
  walletHoldings: { count: holdings.length, sample: holdings[0] },
  portfolioOverview: { present: overview != null },
  defiProtocols: { present: protocols != null },
  defiInvestments: { present: investments != null, sample: investments },
  defiInvestmentDetail: { present: investmentDetail != null, sample: investmentDetail },
  defiPositions: positions
}, null, 2));
