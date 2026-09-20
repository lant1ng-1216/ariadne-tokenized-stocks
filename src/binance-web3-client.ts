import { createHmac } from "node:crypto";
import { fetch, ProxyAgent } from "undici";
import { BinanceWeb3Error } from "./errors.js";

export type BinanceWeb3Config = {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  proxyUrl?: string;
  maxRetries?: number;
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
};

export type BinanceResponse<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
  success: boolean;
};

export class BinanceWeb3Client {
  private readonly baseUrl: string;

  constructor(private readonly config: BinanceWeb3Config) {
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
    const maxRetries = Math.max(0, this.config.maxRetries ?? 2);
    for (let attempt = 0; ; attempt++) {
      const startedAt = Date.now();
      try {
        const result = await this.requestOnce<T>(method, requestPath, body);
        this.config.onRequest?.({ method, path: requestPath, durationMs: Date.now() - startedAt, status: result.payload.code === 0 ? 200 : undefined, code: result.payload.code, success: true, attempt, rateLimitHeaders: result.rateLimitHeaders });
        return result.payload;
      } catch (error) {
        const retryable = error instanceof BinanceWeb3Error ? error.retryable : true;
        this.config.onRequest?.({ method, path: requestPath, durationMs: Date.now() - startedAt, status: error instanceof BinanceWeb3Error ? error.status : undefined, code: error instanceof BinanceWeb3Error ? error.code : undefined, success: false, attempt, rateLimitHeaders: error instanceof BinanceWeb3Error && error.details && typeof error.details === "object" && "rateLimitHeaders" in error.details ? (error.details as any).rateLimitHeaders : undefined });
        if (!retryable || attempt >= maxRetries) throw error;
        const retryAfter = error instanceof BinanceWeb3Error && error.details && typeof error.details === "object" && "rateLimitHeaders" in error.details
          ? Number((error.details as { rateLimitHeaders?: Record<string, string> }).rateLimitHeaders?.["retry-after"] ?? (error.details as { rateLimitHeaders?: Record<string, string> }).rateLimitHeaders?.["Retry-After"])
          : NaN;
        const delay = Number.isFinite(retryAfter) ? Math.max(0, retryAfter * 1000) : (this.config.retryBaseDelayMs ?? 200) * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async requestOnce<T>(method: string, requestPath: string, body: string): Promise<{ payload: BinanceResponse<T>; rateLimitHeaders: Record<string, string> }> {
    const timestamp = new Date().toISOString();
    const signedPath = `/build${requestPath}`;
    const preHash = `${timestamp}${method}${signedPath}${body}`;
    const signature = createHmac("sha256", this.config.apiSecret)
      .update(preHash, "utf8")
      .digest("base64");

    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(`${this.baseUrl}${requestPath}`, {
        method,
      headers: {
        "X-OC-APIKEY": this.config.apiKey,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
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

    const payload = await response.json() as BinanceResponse<T>;
    const rateLimitHeaders: Record<string, string> = {};
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().includes("rate") || key.toLowerCase().includes("limit") || key.toLowerCase().includes("retry-after")) rateLimitHeaders[key] = value;
    }
    if (!response.ok || payload.success === false) {
      const code = payload.code ?? response.status;
      const retryable = response.status >= 500 || code === 429 || code === 42900 || code === 50000 || code === 50001;
      throw new BinanceWeb3Error(`Binance Web3 API ${response.status}: ${payload.msg || "request failed"}`, response.status, code, retryable, { payload, rateLimitHeaders });
    }
    return { payload, rateLimitHeaders };
  }
}
