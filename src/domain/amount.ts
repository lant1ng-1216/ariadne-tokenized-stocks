/** Convert a human-readable token quantity into the token's smallest unit without floating point. */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("Token decimals must be an integer between 0 and 36");
  }
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount)) {
    throw new Error("Amount must be a positive plain decimal string");
  }
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) throw new Error(`Amount exceeds token precision of ${decimals} decimals`);
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
  if (units === 0n) throw new Error("Amount must be greater than zero");
  return units;
}

/** Apply a reviewed slippage bound to a raw quote amount using integer arithmetic. */
export function minimumOutputAfterSlippage(expectedOutput: string, maxSlippageBps: number): string {
  if (!/^\d+$/.test(expectedOutput) || BigInt(expectedOutput) <= 0n) {
    throw new Error("Expected output must be a positive integer in token base units");
  }
  if (!Number.isInteger(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps > 10_000) {
    throw new Error("Maximum slippage must be an integer between 0 and 10000 basis points");
  }
  const minimum = BigInt(expectedOutput) * BigInt(10_000 - maxSlippageBps) / 10_000n;
  if (minimum <= 0n) throw new Error("Reviewed slippage makes the minimum output zero; choose a tighter limit or larger amount");
  return minimum.toString();
}

/** Format raw token units without floating-point conversion. */
export function formatTokenAmount(rawAmount: string, decimals: number): string {
  if (!/^\d+$/.test(rawAmount) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("Cannot format invalid token amount or decimals");
  }
  const value = BigInt(rawAmount);
  if (decimals === 0) return value.toString();
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
