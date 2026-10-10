import { createHmac, randomUUID } from "node:crypto";
import { fetch, ProxyAgent } from "undici";
import { BinanceWeb3Error } from "./errors.js";
import { diagnoseInvalidJsonResponse, diagnoseResponseEnvelope, sanitizeProviderResponseDiagnostics, type ProviderResponseDiagnostics } from "./provider-response-diagnostics.js";

export type BinanceWeb3Config = {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  proxyUrl?: string;
  maxRetries?: number;
  /** Stop retrying when Retry-After/backoff would exceed this wait budget (default 10 seconds). */
  maxRetryDelayMs?: number;
  retryBaseDelayMs?: number;
  timeoutMs?: number;
  onRequest?: (observation: RequestObservation) => void;
};

export type RequestObservation = {
  method: string;
  path: string;
  durationMs: number;
  status?: number;
  code?: string | number;
  success: boolean;
  attempt: number;
  rateLimitHeaders?: Record<string, string>;
  responseDiagnostics?: ProviderResponseDiagnostics;
};

export type BinanceResponse<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
  success: boolean;
};

const DEFAULT_MAX_RETRY_DELAY_MS = 10_000;

function isBinanceResponse(value: unknown): value is BinanceResponse<unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).code === "number" &&
    typeof (value as Record<string, unknown>).msg === "string" &&
    typeof (value as Record<string, unknown>).success === "boolean" &&
    Object.hasOwn(value, "data");
}

function getRateLimitHeaders(response: Awaited<ReturnType<typeof fetch>>): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase().includes("rate") || key.toLowerCase().includes("limit") || key.toLowerCase().includes("retry-after")) headers[key] = value;
  }
  return headers;
}

function isRetryableProviderError(status: number, code: string | number): boolean {
  return status === 429 || status >= 500 || code === 429 || code === 42900 || code === 50000 || code === 50001;
}

function providerErrorCode(payload: unknown, status: number): string | number {
  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    const code = (payload as Record<string, unknown>).code;
    if (typeof code === "number" && Number.isFinite(code)) return code;
    if (typeof code === "string" && /^\d{1,12}$/.test(code)) return code;
  }
  return status;
}

function providerErrorMessage(payload: unknown): string {
  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    const message = (payload as Record<string, unknown>).msg;
    if (typeof message === "string" && message.trim()) {
      return message.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240);
    }
  }
  return "request failed";
}

function parseRetryAfterDelayMs(value: string | undefined, now = Date.now()): number | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw) * 1000;
  const retryAt = Date.parse(raw);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : undefined;
}

export class BinanceWeb3Client {
  private readonly baseUrl: string;

  constructor(private readonly config: BinanceWeb3Config) {
    if (config.maxRetries !== undefined && (!Number.isInteger(config.maxRetries) || config.maxRetries < 0 || config.maxRetries > 5)) {
      throw new RangeError("maxRetries must be an integer between 0 and 5");
    }
    if (config.maxRetryDelayMs !== undefined && (!Number.isFinite(config.maxRetryDelayMs) || config.maxRetryDelayMs < 0)) {
      throw new RangeError("maxRetryDelayMs must be a finite nonnegative number");
    }
    if (config.retryBaseDelayMs !== undefined && (!Number.isFinite(config.retryBaseDelayMs) || config.retryBaseDelayMs < 0)) {
      throw new RangeError("retryBaseDelayMs must be a finite nonnegative number");
    }
    if (config.timeoutMs !== undefined && (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0)) {
      throw new RangeError("timeoutMs must be a finite positive number");
    }
    this.baseUrl = (config.baseUrl ?? "https://web3.binance.com/build").replace(/\/$/, "");
  }

  async get<T>(path: string, params: Record<string, string> = {}): Promise<BinanceResponse<T>> {
    const query = new URLSearchParams(params).toString();
    const requestPath = `${path.startsWith("/") ? path : `/${path}`}${query ? `?${query}` : ""}`;
    return this.request<T>("GET", requestPath, "");
  }

  async post<T>(path: string, body: unknown): Promise<BinanceResponse<T>> {
    const serialized = JSON.stringify(body);
    const requestPath = path.startsWith("/") ? path : `/${path}`;
    return this.request<T>("POST", requestPath, serialized);
  }

  private async request<T>(method: string, requestPath: string, body: string): Promise<BinanceResponse<T>> {
    const maxRetries = this.config.maxRetries ?? 2;
    for (let attempt = 0; ; attempt++) {
      const startedAt = Date.now();
      try {
        const result = await this.requestOnce<T>(method, requestPath, body);
        this.config.onRequest?.({ method, path: requestPath, durationMs: Date.now() - startedAt, status: result.httpStatus, code: result.payload.code, success: true, attempt, rateLimitHeaders: result.rateLimitHeaders });
        return result.payload;
      } catch (error) {
        const retryable = error instanceof BinanceWeb3Error ? error.retryable : true;
        this.config.onRequest?.({ method, path: requestPath, durationMs: Date.now() - startedAt, status: error instanceof BinanceWeb3Error ? error.status : undefined, code: error instanceof BinanceWeb3Error ? error.code : undefined, success: false, attempt, rateLimitHeaders: error instanceof BinanceWeb3Error && error.details && typeof error.details === "object" && "rateLimitHeaders" in error.details ? (error.details as any).rateLimitHeaders : undefined, responseDiagnostics: error instanceof BinanceWeb3Error ? sanitizeProviderResponseDiagnostics(error.responseDiagnostics) : undefined });
        if (!retryable || attempt >= maxRetries) throw error;
        const retryAfterHeader = error instanceof BinanceWeb3Error && error.details && typeof error.details === "object" && "rateLimitHeaders" in error.details
          ? (error.details as { rateLimitHeaders?: Record<string, string> }).rateLimitHeaders?.["retry-after"] ??
            (error.details as { rateLimitHeaders?: Record<string, string> }).rateLimitHeaders?.["Retry-After"]
          : undefined;
        const retryAfterDelayMs = parseRetryAfterDelayMs(retryAfterHeader);
        const delay = retryAfterDelayMs ?? (this.config.retryBaseDelayMs ?? 200) * 2 ** attempt;
        const maxRetryDelayMs = Math.max(0, this.config.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS);
        if (delay > maxRetryDelayMs) {
          throw new BinanceWeb3Error(
            "Binance Web3 API retry delay exceeds the configured budget",
            error instanceof BinanceWeb3Error ? error.status : 0,
            "RETRY_DELAY_EXCEEDS_BUDGET",
            false,
            { retryAfterMs: delay, maxRetryDelayMs }
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async requestOnce<T>(method: string, requestPath: string, body: string): Promise<{ payload: BinanceResponse<T>; rateLimitHeaders: Record<string, string>; httpStatus: number }> {
    const timestamp = new Date().toISOString();
    const signedPath = `/build${requestPath}`;
    const preHash = `${timestamp}${method}${signedPath}${body}`;
    const signature = createHmac("sha256", this.config.apiSecret)
      .update(preHash, "utf8")
      .digest("base64");
    const nonce = randomUUID();

    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(`${this.baseUrl}${requestPath}`, {
        method,
      headers: {
        "X-OC-APIKEY": this.config.apiKey,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
        "X-OC-NONCE": nonce,
        "X-OC-RECV-WINDOW": "60000",
        ...(body ? { "Content-Type": "application/json" } : {})
      },
        body: body || undefined,
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 30_000),
        ...(this.config.proxyUrl ? { dispatcher: new ProxyAgent(this.config.proxyUrl) } : {})
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BinanceWeb3Error(`Binance Web3 API request failed: ${message}`, 0, "NETWORK_TIMEOUT", true, { timeoutMs: this.config.timeoutMs ?? 30_000 });
    }

    const rateLimitHeaders = getRateLimitHeaders(response);
    let rawPayload: unknown;
    try {
      rawPayload = await response.json();
    } catch {
      if (!response.ok) {
        throw new BinanceWeb3Error(
          `Binance Web3 API ${response.status}: request failed`,
          response.status,
          response.status,
          isRetryableProviderError(response.status, response.status),
          { rateLimitHeaders },
          diagnoseInvalidJsonResponse(response.status, response.headers.get("content-type"))
        );
      }
      throw new BinanceWeb3Error("Binance Web3 API returned invalid JSON", response.status, "INVALID_JSON", false, undefined, diagnoseInvalidJsonResponse(response.status, response.headers.get("content-type")));
    }
    if (!response.ok) {
      const code = providerErrorCode(rawPayload, response.status);
      const validEnvelope = isBinanceResponse(rawPayload);
      throw new BinanceWeb3Error(
        `Binance Web3 API ${response.status}: ${providerErrorMessage(rawPayload)}`,
        response.status,
        code,
        isRetryableProviderError(response.status, code),
        { ...(validEnvelope ? { payload: rawPayload } : {}), rateLimitHeaders },
        validEnvelope ? undefined : diagnoseResponseEnvelope(response.status, response.headers.get("content-type"), rawPayload)
      );
    }
    if (!isBinanceResponse(rawPayload)) {
      throw new BinanceWeb3Error("Binance Web3 API returned an invalid response envelope", response.status, "INVALID_RESPONSE", false, undefined, diagnoseResponseEnvelope(response.status, response.headers.get("content-type"), rawPayload));
    }
    const payload = rawPayload as BinanceResponse<T>;
    if (payload.success === false) {
      const code = payload.code ?? response.status;
      const retryable = isRetryableProviderError(response.status, code);
      throw new BinanceWeb3Error(`Binance Web3 API ${response.status}: ${payload.msg || "request failed"}`, response.status, code, retryable, { payload, rateLimitHeaders });
    }
    return { payload, rateLimitHeaders, httpStatus: response.status };
  }
}
