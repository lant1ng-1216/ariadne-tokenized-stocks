import type { VerifiedTokenIdentity } from "../domain/types.js";
import type { TransactionService } from "./transaction.js";

export const BSC_SUPPORTED_INPUT_TOKENS = {
  USDT: {
    chainId: "56",
    contractAddress: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18
  }
} as const;

/** Resolve only curated BSC input tokens and confirm address/symbol/precision on chain. */
export async function resolveBscInputToken(
  transactions: Pick<TransactionService, "erc20TokenMetadata">,
  symbol: string,
  chainId = "56"
): Promise<VerifiedTokenIdentity> {
  if (chainId !== "56") throw new Error("The first funded-closure route supports BSC chain 56 only");
  const normalized = symbol.trim().toUpperCase();
  const configured = BSC_SUPPORTED_INPUT_TOKENS[normalized as keyof typeof BSC_SUPPORTED_INPUT_TOKENS];
  if (!configured) throw new Error(`Input token ${normalized || "(empty)"} is not in the supported BSC allowlist`);
  const metadata = await transactions.erc20TokenMetadata(configured.chainId, configured.contractAddress);
  if (metadata.contractAddress.toLowerCase() !== configured.contractAddress.toLowerCase() ||
    metadata.chainId !== configured.chainId || metadata.symbol.toUpperCase() !== normalized || metadata.decimals !== configured.decimals) {
    throw new Error(`On-chain metadata does not match the curated ${normalized} BSC token identity`);
  }
  return metadata;
}

/** Bind a directory-selected stock representation to its live on-chain ERC-20 metadata. */
export async function verifyBscStockToken(
  transactions: Pick<TransactionService, "erc20TokenMetadata">,
  token: { chainId: string; contractAddress: string; tokenSymbol: string }
): Promise<VerifiedTokenIdentity> {
  if (token.chainId !== "56") throw new Error("The first funded-closure route supports BSC chain 56 only");
  const metadata = await transactions.erc20TokenMetadata(token.chainId, token.contractAddress);
  if (metadata.contractAddress.toLowerCase() !== token.contractAddress.toLowerCase() ||
    metadata.symbol.toUpperCase() !== token.tokenSymbol.toUpperCase()) {
    throw new Error("On-chain stock-token metadata does not match the selected issuer representation");
  }
  return metadata;
}
