import { TransactionService } from "../src/services/transaction.js";

const transactions = new TransactionService({} as any);
const tokens = await Promise.all([
  transactions.erc20TokenMetadata("56", "0x55d398326f99059fF775485246999027B3197955"),
  transactions.erc20TokenMetadata("56", "0x02fca66c1d1afb4e2a7884261eb00f63598a7436")
]);
console.log(JSON.stringify({ chainId: "56", verifiedTokens: tokens.map(({ chainId, contractAddress, symbol, name, decimals, verificationSource }) => ({ chainId, contractAddress, symbol, name, decimals, verificationSource })) }, null, 2));
