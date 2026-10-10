import type { Eip1193WalletProvider } from "./purchase-approval-flow.js";

export type AnnouncedEip1193Provider = {
  info?: { rdns?: string; name?: string; uuid?: string; icon?: string };
  provider?: Eip1193WalletProvider & { isMetaMask?: boolean };
};

type IdentifiedProvider = Eip1193WalletProvider & { isMetaMask?: boolean };

function isProvider(value: unknown): value is IdentifiedProvider {
  return Boolean(value && typeof value === "object" && typeof (value as IdentifiedProvider).request === "function");
}

export type Eip1193ProviderSelection =
  | { status: "selected"; provider: Eip1193WalletProvider }
  | { status: "ambiguous"; candidateCount: number }
  | { status: "none" };

/**
 * Resolve MetaMask for an external page that explicitly promises a MetaMask
 * handoff. EIP-6963 identity is authoritative. The legacy `isMetaMask` flag is
 * used only when no exact announcement exists, and only when it identifies one
 * unique provider. Generic injected providers are never relabelled MetaMask.
 */
export function selectMetaMaskProvider(options: {
  injectedProvider?: IdentifiedProvider;
  injectedProviders?: IdentifiedProvider[];
  announcements?: AnnouncedEip1193Provider[];
}): Eip1193ProviderSelection {
  const announcedMatches = [...new Set((options.announcements ?? [])
    .filter((entry) => entry.info?.rdns?.toLowerCase() === "io.metamask" && isProvider(entry.provider))
    .map((entry) => entry.provider!))];
  if (announcedMatches.length === 1) return { status: "selected", provider: announcedMatches[0] };
  if (announcedMatches.length > 1) return { status: "ambiguous", candidateCount: announcedMatches.length };

  const legacyCandidates: IdentifiedProvider[] = [];
  if (isProvider(options.injectedProvider) && options.injectedProvider.isMetaMask === true) {
    legacyCandidates.push(options.injectedProvider);
  }
  for (const provider of options.injectedProviders ?? []) {
    if (isProvider(provider) && provider.isMetaMask === true) legacyCandidates.push(provider);
  }
  const uniqueLegacy = [...new Set(legacyCandidates)];
  if (uniqueLegacy.length === 1) return { status: "selected", provider: uniqueLegacy[0] };
  if (uniqueLegacy.length > 1) return { status: "ambiguous", candidateCount: uniqueLegacy.length };
  return { status: "none" };
}

/**
 * Accept an explicit Ariadne host bridge. Otherwise combine injected and
 * announced providers, deduplicate by object identity, and select only a single
 * candidate. When the product explicitly requests a named wallet, use its
 * EIP-6963 reverse-DNS announcement (or one unique legacy MetaMask flag) only
 * to resolve an otherwise ambiguous browser environment. Multiple matches
 * still fail closed.
 */
export function selectEip1193Provider(options: {
  hostBridgeProvider?: Eip1193WalletProvider;
  injectedProvider?: IdentifiedProvider;
  injectedProviders?: IdentifiedProvider[];
  announcements?: AnnouncedEip1193Provider[];
  preferredWalletRdns?: string[];
}): Eip1193ProviderSelection {
  const bridge = options.hostBridgeProvider;
  if (bridge && typeof bridge.request === "function") return { status: "selected", provider: bridge };

  const candidates: IdentifiedProvider[] = [];
  if (isProvider(options.injectedProvider)) candidates.push(options.injectedProvider);
  for (const provider of options.injectedProviders ?? []) if (isProvider(provider)) candidates.push(provider);
  for (const announcement of options.announcements ?? []) {
    if (!isProvider(announcement.provider)) continue;
    candidates.push(announcement.provider);
  }

  const uniqueProviders = [...new Set(candidates)];
  if (uniqueProviders.length === 1) return { status: "selected", provider: uniqueProviders[0] };
  if (uniqueProviders.length > 1 && options.preferredWalletRdns?.length) {
    const preferredRdns = new Set(options.preferredWalletRdns.map((value) => value.toLowerCase()));
    const announcedMatches = [...new Set((options.announcements ?? [])
      .filter((entry) => entry.info?.rdns && preferredRdns.has(entry.info.rdns.toLowerCase()) && isProvider(entry.provider))
      .map((entry) => entry.provider!))];
    if (announcedMatches.length === 1) return { status: "selected", provider: announcedMatches[0] };

    // Some injected-wallet environments expose a provider list without EIP-6963
    // metadata. The page explicitly asks for MetaMask, so a single MetaMask-marked
    // provider is a deterministic match; multiple matches still fail closed.
    const metaMaskMatches = uniqueProviders.filter((provider) => provider.isMetaMask === true);
    if (metaMaskMatches.length === 1) return { status: "selected", provider: metaMaskMatches[0] };
  }
  if (uniqueProviders.length > 1) return { status: "ambiguous", candidateCount: uniqueProviders.length };
  return { status: "none" };
}
