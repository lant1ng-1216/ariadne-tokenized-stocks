import type { ProviderResponseDiagnostics } from "./provider-response-diagnostics.js";

export class BinanceWeb3Error extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | number,
    public readonly retryable: boolean,
    public readonly details?: unknown,
    public readonly responseDiagnostics?: ProviderResponseDiagnostics
  ) {
    super(message);
    this.name = "BinanceWeb3Error";
  }
}
