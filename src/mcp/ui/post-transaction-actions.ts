export type PostTransactionAssetDisplay = {
  operation?: unknown;
  issuer?: unknown;
  outputContract?: unknown;
  outputSymbol?: unknown;
  tokenLogoUrl?: unknown;
  purchaseBaseline?: unknown;
};

export type WalletWatchAssetRequest = {
  method: "wallet_watchAsset";
  params: {
    type: "ERC20";
    options: {
      address: string;
      symbol: string;
      decimals: number;
      image?: string;
    };
  };
};

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function bscScanTransactionUrl(txHash: string): string | undefined {
  return TX_HASH.test(txHash) ? `https://bscscan.com/tx/${txHash}` : undefined;
}

export function walletWatchAssetRequest(display: PostTransactionAssetDisplay): WalletWatchAssetRequest | undefined {
  if (display.operation !== "purchase" || typeof display.outputContract !== "string" || !ADDRESS.test(display.outputContract)) return undefined;
  if (typeof display.outputSymbol !== "string" || !/^[A-Za-z0-9._-]{1,11}$/.test(display.outputSymbol)) return undefined;
  const baseline = display.purchaseBaseline && typeof display.purchaseBaseline === "object"
    ? display.purchaseBaseline as Record<string, unknown>
    : undefined;
  const decimals = baseline?.outputDecimals;
  if (typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) return undefined;
  const image = typeof display.tokenLogoUrl === "string" && /^https:\/\//i.test(display.tokenLogoUrl)
    ? display.tokenLogoUrl
    : undefined;
  return {
    method: "wallet_watchAsset",
    params: {
      type: "ERC20",
      options: {
        address: display.outputContract,
        symbol: display.outputSymbol,
        decimals,
        ...(image ? { image } : {})
      }
    }
  };
}
