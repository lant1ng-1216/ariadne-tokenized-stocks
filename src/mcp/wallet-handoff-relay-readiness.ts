import type { Server } from "node:http";
import { startWalletHandoffRelayFromEnvironment } from "./wallet-handoff-relay-server.js";

export type WalletHandoffRelayReadiness =
  | { status: "ready"; mode: "existing" | "embedded"; origin: string; server?: Server }
  | { status: "unavailable"; mode: "disabled" | "hosted" | "loopback"; origin?: string; reason: string };

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export async function probeWalletHandoffRelay(
  origin: string,
  fetcher: typeof fetch = fetch
): Promise<{ ready: true } | { ready: false; reason: string }> {
  try {
    const response = await fetcher(new URL("/healthz", origin), {
      method: "GET",
      signal: AbortSignal.timeout(2_000)
    });
    if (!response.ok) return { ready: false, reason: `health check returned HTTP ${response.status}` };
    const body = await response.json().catch(() => undefined) as { status?: string; service?: string } | undefined;
    if (body?.status !== "ok" || body.service !== "ariadne-wallet-handoff-relay") {
      return { ready: false, reason: "health check returned an unexpected service identity" };
    }
    return { ready: true };
  } catch (error) {
    const code = error && typeof error === "object" && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
      ? String(error.cause.code)
      : undefined;
    return { ready: false, reason: code ? `connection failed (${code})` : "connection failed or timed out" };
  }
}

export async function ensureWalletHandoffRelayReady(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: {
    fetcher?: typeof fetch;
    startLocal?: typeof startWalletHandoffRelayFromEnvironment;
  } = {}
): Promise<WalletHandoffRelayReadiness> {
  const configuredUrl = env.ARIADNE_WALLET_HANDOFF_RELAY_URL?.trim();
  const secret = env.ARIADNE_WALLET_HANDOFF_RELAY_SECRET?.trim();
  if (!configuredUrl || !secret) {
    return {
      status: "unavailable",
      mode: "disabled",
      reason: "Wallet handoff relay URL and service secret must both be configured before purchase-plan links can be created"
    };
  }

  let relayUrl: URL;
  try {
    relayUrl = new URL(configuredUrl);
  } catch {
    return { status: "unavailable", mode: "disabled", reason: "Wallet handoff relay URL is invalid" };
  }
  const origin = relayUrl.origin;
  const loopback = relayUrl.protocol === "http:" && isLoopbackHost(relayUrl.hostname);
  if (!loopback && relayUrl.protocol !== "https:") {
    return { status: "unavailable", mode: "hosted", origin, reason: "Hosted wallet handoff relays must use HTTPS" };
  }

  const initial = await probeWalletHandoffRelay(origin, dependencies.fetcher);
  if (initial.ready) return { status: "ready", mode: "existing", origin };
  if (!loopback) {
    return {
      status: "unavailable",
      mode: "hosted",
      origin,
      reason: `Hosted wallet handoff relay is unreachable: ${initial.reason}`
    };
  }

  const portalOrigin = env.ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN?.trim() || origin;
  let parsedPortal: URL;
  try {
    parsedPortal = new URL(portalOrigin);
  } catch {
    return { status: "unavailable", mode: "loopback", origin, reason: "Wallet handoff portal origin is invalid" };
  }
  if (parsedPortal.origin !== origin) {
    return {
      status: "unavailable",
      mode: "loopback",
      origin,
      reason: "Local wallet handoff relay URL and portal origin must use the same origin"
    };
  }

  const port = relayUrl.port ? Number(relayUrl.port) : 80;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return { status: "unavailable", mode: "loopback", origin, reason: "Local wallet handoff relay port is invalid" };
  }
  const host = relayUrl.hostname === "[::1]" ? "::1" : relayUrl.hostname;
  try {
    const startLocal = dependencies.startLocal ?? startWalletHandoffRelayFromEnvironment;
    const started = await startLocal({ ...env, ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN: origin }, { host, port });
    const finalProbe = await probeWalletHandoffRelay(origin, dependencies.fetcher);
    if (!finalProbe.ready) {
      started.server.close();
      return {
        status: "unavailable",
        mode: "loopback",
        origin,
        reason: `Embedded wallet handoff relay started but did not become healthy: ${finalProbe.reason}`
      };
    }
    return { status: "ready", mode: "embedded", origin, server: started.server };
  } catch (error) {
    const retry = await probeWalletHandoffRelay(origin, dependencies.fetcher);
    if (retry.ready) return { status: "ready", mode: "existing", origin };
    const reason = error instanceof Error ? error.message : String(error);
    return {
      status: "unavailable",
      mode: "loopback",
      origin,
      reason: `Local wallet handoff relay could not start: ${reason}`
    };
  }
}
