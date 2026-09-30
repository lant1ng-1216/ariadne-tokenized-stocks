export type RepresentationIdentity = {
  chainId: string;
  platformId: string;
  contractAddress: string;
};

export type TokenPriceProbeRecord = {
  binanceChainId: string;
  platformId: string;
  tokenContractAddress: string;
  tokenPrice?: string;
  referencePrice?: string;
  tokenPriceUpdatedAt?: number;
};

export function representationIdentityKey(item: RepresentationIdentity): string {
  const address = item.contractAddress.trim();
  const normalizedAddress = /^0x[0-9a-f]{40}$/i.test(address) ? address.toLowerCase() : address;
  return `${item.chainId.trim()}:${item.platformId.trim().toLowerCase()}:${normalizedAddress}`;
}

export function compareRepresentationIdentities(
  expected: RepresentationIdentity[],
  actual: RepresentationIdentity[],
) {
  const expectedKeys = expected.map(representationIdentityKey);
  const actualKeys = actual.map(representationIdentityKey);
  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);
  const missing = [...expectedSet].filter((key) => !actualSet.has(key));
  const unexpected = [...actualSet].filter((key) => !expectedSet.has(key));

  return {
    requestedRows: expected.length,
    uniqueRequestedRepresentations: expectedSet.size,
    returnedRows: actual.length,
    matchedRepresentations: [...expectedSet].filter((key) => actualSet.has(key)).length,
    missingRepresentations: missing.length,
    unexpectedRepresentations: unexpected.length,
    duplicateRequestedRows: expected.length - expectedSet.size,
    duplicateReturnedRows: actual.length - actualSet.size,
    identityMatches: missing.length === 0 && unexpected.length === 0 &&
      expected.length === expectedSet.size && actual.length === actualSet.size,
  };
}

export function summarizeTokenPriceProbe(
  expected: RepresentationIdentity[],
  actual: TokenPriceProbeRecord[],
) {
  const identityCoverage = compareRepresentationIdentities(expected, actual.map((item) => ({
    chainId: item.binanceChainId,
    platformId: item.platformId,
    contractAddress: item.tokenContractAddress,
  })));
  const expectedKeys = new Set(expected.map(representationIdentityKey));
  const rowsByIdentity = new Map<string, TokenPriceProbeRecord[]>();
  for (const item of actual) {
    const key = representationIdentityKey({
      chainId: item.binanceChainId,
      platformId: item.platformId,
      contractAddress: item.tokenContractAddress,
    });
    rowsByIdentity.set(key, [...(rowsByIdentity.get(key) ?? []), item]);
  }
  const hasPrice = (item: TokenPriceProbeRecord) => isPositiveNumber(item.tokenPrice);
  const hasTimestamp = (item: TokenPriceProbeRecord) =>
    typeof item.tokenPriceUpdatedAt === "number" && Number.isFinite(item.tokenPriceUpdatedAt) && item.tokenPriceUpdatedAt > 0;

  return {
    ...identityCoverage,
    returnedRowsWithValidPrice: actual.filter(hasPrice).length,
    returnedRowsWithValidReferencePrice: actual.filter((item) => isPositiveNumber(item.referencePrice)).length,
    returnedRowsWithValidUpdateTimestamp: actual.filter(hasTimestamp).length,
    matchedRepresentationsWithValidPrice: [...expectedKeys].filter((key) => {
      const rows = rowsByIdentity.get(key) ?? [];
      return rows.length === 1 && hasPrice(rows[0]!);
    }).length,
    matchedRepresentationsWithValidUpdateTimestamp: [...expectedKeys].filter((key) => {
      const rows = rowsByIdentity.get(key) ?? [];
      return rows.length === 1 && hasTimestamp(rows[0]!);
    }).length,
  };
}

function isPositiveNumber(value: string | undefined): boolean {
  if (value === undefined || value.trim() === "") return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}
