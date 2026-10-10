export type GatewayEnv = {
  ARIADNE_GATEWAY_TOKEN: string;
  BINANCE_WEB3_UPSTREAM_BASE_URL: string;
};

type Fetcher = (request: Request) => Promise<Response>;

const MAX_BODY_BYTES = 65_536;
const ALLOWED_PREFIX = "/api/v1/dex/market/";
const FORWARDED_HEADERS = [
  "accept", "content-type", "x-oc-apikey", "x-oc-timestamp", "x-oc-sign", "x-oc-nonce", "x-oc-recv-window"
];

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

async function tokenMatches(expected: string, candidate: string): Promise<boolean> {
  if (!expected || !candidate) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(candidate))
  ]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let different = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) different |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return different === 0;
}

export async function handleGatewayRequest(request: Request, env: GatewayEnv, fetcher: Fetcher = fetch): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/healthz" && request.method === "GET") return json(200, { status: "ok", service: "ariadne-binance-egress" });
  if (request.method !== "GET") return json(405, { error: "method_not_allowed", allowed: ["GET"] });
  const suppliedToken = request.headers.get("x-ariadne-gateway-token") ?? "";
  if (!await tokenMatches(env.ARIADNE_GATEWAY_TOKEN?.trim() ?? "", suppliedToken)) return json(401, { error: "unauthorized" });
  if (!url.pathname.startsWith(ALLOWED_PREFIX) || url.pathname.includes("..")) return json(403, { error: "path_not_allowed" });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json(413, { error: "request_body_too_large" });

  let upstreamBase: URL;
  try { upstreamBase = new URL(env.BINANCE_WEB3_UPSTREAM_BASE_URL); }
  catch { return json(503, { error: "gateway_not_ready" }); }
  if (upstreamBase.protocol !== "https:") return json(503, { error: "gateway_not_ready" });
  const target = new URL(`${upstreamBase.href.replace(/\/$/, "")}${url.pathname}${url.search}`);
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  try {
    const upstream = await fetcher(new Request(target, { method: "GET", headers, redirect: "manual" }));
    const responseHeaders = new Headers({ "cache-control": "no-store", "x-content-type-options": "nosniff" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return json(502, { error: "upstream_unreachable" });
  }
}

export default {
  fetch(request: Request, env: GatewayEnv): Promise<Response> {
    return handleGatewayRequest(request, env);
  }
};
