import UniversalProvider from "@walletconnect/universal-provider";
import type { Eip1193WalletProvider } from "./purchase-approval-flow.js";

const BSC_CAIP_CHAIN = "eip155:56";
const PAIRING_CREATED_EVENT = "pairing_create";
let storagePrefixSequence = 0;

type WalletConnectSource = Pick<UniversalProvider, "request" | "enable"> & {
  session?: UniversalProvider["session"];
};

type WalletConnectPairingState = { uri?: string; cancel: () => void; cleanupWarning?: string };
type WalletConnectInit = typeof UniversalProvider.init;

export function adaptWalletConnectProvider(source: WalletConnectSource): Eip1193WalletProvider {
  const accountsForBsc = () => (source.session?.namespaces.eip155?.accounts ?? [])
    .filter((account) => account.startsWith(`${BSC_CAIP_CHAIN}:`))
    .map((account) => account.slice(`${BSC_CAIP_CHAIN}:`.length));

  return {
    async request({ method, params }) {
      if (method === "eth_chainId") return "0x38";
      if (method === "eth_accounts") return accountsForBsc();
      if (method === "eth_requestAccounts") return source.enable();
      const requestParams = Array.isArray(params) ? [...params] : params;
      return source.request({ method, params: requestParams }, BSC_CAIP_CHAIN);
    }
  };
}

function pairingTopic(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const topic = (value as { topic?: unknown }).topic;
  return typeof topic === "string" && topic.length > 0 ? topic : undefined;
}

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function createAttemptStoragePrefix(): string {
  const suffix = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${++storagePrefixSequence}-${Math.random().toString(36).slice(2)}`;
  return `ariadne-walletconnect-${suffix}`;
}

export async function connectWalletConnectProvider(
  projectId: string,
  appUrl: string,
  onPairingState: (state: WalletConnectPairingState) => void,
  timeoutMs = 120_000,
  initProvider: WalletConnectInit = (options) => UniversalProvider.init(options)
): Promise<Eip1193WalletProvider> {
  let provider: UniversalProvider | undefined;
  let settled = false;
  let cancelled = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectPending: ((error: Error) => void) | undefined;
  let cleanupInFlight: Promise<string[]> | undefined;
  const pairingTopics = new Set<string>();
  const disconnectedPairings = new Set<string>();
  const pairingCleanupInFlight = new Map<string, Promise<boolean>>();
  let pairingEvents: { on(event: string, listener: (pairing: unknown) => void): unknown; removeListener(event: string, listener: (pairing: unknown) => void): unknown } | undefined;
  let pairingCreatedListener: ((pairing: unknown) => void) | undefined;
  let uriListener: ((uri: string) => void) | undefined;

  const cleanupPairing = (topic: string, activeProvider: UniversalProvider): Promise<boolean> => {
    const existingCleanup = pairingCleanupInFlight.get(topic);
    if (existingCleanup) return existingCleanup;
    const operation = (async () => {
      try {
        if (disconnectedPairings.has(topic)) return true;
        // WalletConnect emits pairing_create just before persisting the pairing. Wait
        // briefly for its store entry so the protocol disconnect can delete it.
        for (let attempt = 0; attempt < 20; attempt += 1) {
          if (!activeProvider.client.pairing.keys.includes(topic)) {
            await delay(25);
            continue;
          }
          try {
            await activeProvider.client.core.pairing.disconnect({ topic });
            disconnectedPairings.add(topic);
            return true;
          } catch {
            await delay(25);
          }
        }
        return !activeProvider.client.pairing.keys.includes(topic);
      } catch {
        return false;
      }
    })();
    let trackedCleanup!: Promise<boolean>;
    trackedCleanup = operation.finally(() => {
      if (pairingCleanupInFlight.get(topic) === trackedCleanup) pairingCleanupInFlight.delete(topic);
    });
    pairingCleanupInFlight.set(topic, trackedCleanup);
    return trackedCleanup;
  };

  const detachListeners = () => {
    if (pairingEvents && pairingCreatedListener) pairingEvents.removeListener(PAIRING_CREATED_EVENT, pairingCreatedListener);
    if (provider && uriListener) provider.events.removeListener("display_uri", uriListener);
    pairingEvents = undefined;
    pairingCreatedListener = undefined;
    uriListener = undefined;
  };

  const cleanupAttempt = async (activeProvider: UniversalProvider): Promise<string[]> => {
    if (cleanupInFlight) return cleanupInFlight;
    const cleanupOperation = (async () => {
      const issues: string[] = [];
      const pairingResults = await Promise.all([...pairingTopics].map((topic) => trackPairingCleanup(topic, activeProvider)));
      if (pairingResults.some((removed) => !removed)) issues.push("pending WalletConnect pairing could not be removed");
      try {
        if (activeProvider.session) {
          await activeProvider.disconnect();
        }
      } catch {
        issues.push("WalletConnect session could not be disconnected");
      }
      try {
        await activeProvider.client.core.relayer.transportClose();
      } catch {
        issues.push("WalletConnect relay could not be closed");
      }
      return issues;
    })();
    cleanupInFlight = cleanupOperation;
    try {
      return await cleanupOperation;
    } finally {
      if (cleanupInFlight === cleanupOperation) cleanupInFlight = undefined;
    }
  };

  let cleanupWarningReported = false;
  const reportCleanupIssues = (issues: string[]) => {
    if (issues.length === 0 || cleanupWarningReported) return;
    cleanupWarningReported = true;
    onPairingState({
      cancel: () => {},
      cleanupWarning: `WalletConnect cleanup did not fully complete (${issues.join(", ")}). Revoke any Ariadne session in your wallet before retrying.`
    });
  };

  const trackPairingCleanup = (topic: string, activeProvider: UniversalProvider): Promise<boolean> => {
    const cleanup = cleanupPairing(topic, activeProvider);
    void cleanup.then((removed) => {
      if (cancelled && !removed) reportCleanupIssues(["pending WalletConnect pairing could not be removed"]);
    }).catch(() => {
      if (cancelled) reportCleanupIssues(["pending WalletConnect pairing cleanup failed"]);
    });
    return cleanup;
  };

  const cancel = (message = "Wallet connection was cancelled. No transaction was sent.") => {
    if (settled) return;
    cancelled = true;
    if (timeout) clearTimeout(timeout);
    rejectPending?.(new Error(message));
    if (provider && uriListener) provider.events.removeListener("display_uri", uriListener);
    uriListener = undefined;
    if (provider) void cleanupAttempt(provider).then(reportCleanupIssues);
  };

  onPairingState({ cancel: () => cancel() });

  return new Promise<Eip1193WalletProvider>((resolve, reject) => {
    rejectPending = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    timeout = setTimeout(() => cancel("Wallet connection timed out. No transaction was sent."), timeoutMs);

    void initProvider({
      projectId,
      // WalletConnect Core is global-cached by its storage prefix. Isolate each
      // pairing attempt so cancelling an old attempt cannot close a retry's relay.
      customStoragePrefix: createAttemptStoragePrefix(),
      logger: "error",
      telemetryEnabled: false,
      metadata: {
        name: "Ariadne",
        description: "Review a BSC tokenized-stock purchase in your Agent",
        url: appUrl,
        icons: []
      }
    }).then(async (initializedProvider) => {
      provider = initializedProvider;
      if (cancelled) {
        reportCleanupIssues(await cleanupAttempt(initializedProvider));
        return;
      }

      pairingEvents = initializedProvider.client.core.pairing.events as unknown as typeof pairingEvents;
      pairingCreatedListener = (pairing) => {
        const topic = pairingTopic(pairing);
        if (!topic) return;
        pairingTopics.add(topic);
        if (cancelled) void trackPairingCleanup(topic, initializedProvider);
      };
      pairingEvents?.on(PAIRING_CREATED_EVENT, pairingCreatedListener);
      uriListener = (uri) => onPairingState({ uri, cancel: () => cancel() });
      initializedProvider.events.on("display_uri", uriListener);

      void initializedProvider.connect({
        namespaces: {
          eip155: {
            chains: [BSC_CAIP_CHAIN],
            methods: ["eth_sendTransaction"],
            events: ["accountsChanged", "chainChanged"]
          }
        }
      }).then(async (session) => {
        if (cancelled) {
          reportCleanupIssues(await cleanupAttempt(initializedProvider));
          detachListeners();
          return;
        }
        if (!session) throw new Error("The wallet did not approve a BSC WalletConnect session.");
        const adapted = adaptWalletConnectProvider(initializedProvider);
        const accounts = await adapted.request({ method: "eth_accounts" });
        if (!Array.isArray(accounts) || accounts.length === 0) {
          throw new Error("The connected wallet did not approve a BSC account.");
        }
        if (cancelled) {
          reportCleanupIssues(await cleanupAttempt(initializedProvider));
          detachListeners();
          return;
        }
        settled = true;
        if (timeout) clearTimeout(timeout);
        rejectPending = undefined;
        detachListeners();
        resolve({
          ...adapted,
          async closeSession() {
            try {
              if (initializedProvider.session) await initializedProvider.disconnect();
            } finally {
              await initializedProvider.client.core.relayer.transportClose();
            }
          }
        });
      }).catch(async (error: unknown) => {
        if (cancelled) {
          reportCleanupIssues(await cleanupAttempt(initializedProvider));
          detachListeners();
          return;
        }
        cancelled = true;
        reportCleanupIssues(await cleanupAttempt(initializedProvider));
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        rejectPending = undefined;
        detachListeners();
        reject(error instanceof Error ? error : new Error("WalletConnect session could not be established."));
      });
    }).catch((error: unknown) => {
      if (cancelled || settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      rejectPending = undefined;
      reject(error instanceof Error ? error : new Error("WalletConnect could not initialize."));
    });
  });
}
