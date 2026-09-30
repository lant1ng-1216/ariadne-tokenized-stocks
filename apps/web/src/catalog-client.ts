export type AssetCatalogPayload<TAsset> = {
  mode: string;
  view: {
    items: TAsset[];
    summary: {
      totalRepresentations: number;
      distinctTickerValues: number;
      issuerCount: number;
      returned: number;
    };
    pagination: {
      hasMore: boolean;
      offset: number;
      limit: number;
      returned: number;
    };
    provenance?: {
      sourceResponseTimestampMs?: number;
      platformMetadataResponseTimestampMs?: number;
    };
  };
};

export async function loadAssetCatalogSnapshot<TAsset>(
  signal: AbortSignal,
  request: typeof fetch = fetch
): Promise<AssetCatalogPayload<TAsset>> {
  const response = await request("/api/catalog?chainId=56&limit=1000&offset=0", { signal });
  if (!response.ok) throw new Error("Asset catalog unavailable");
  const payload = await response.json() as AssetCatalogPayload<TAsset>;
  if (!Array.isArray(payload.view?.items) || !payload.view?.pagination || !payload.view?.summary) {
    throw new Error("Invalid asset catalog response");
  }
  if (payload.view.pagination.offset !== 0 ||
    payload.view.pagination.returned !== payload.view.items.length ||
    payload.view.summary.returned !== payload.view.items.length) {
    throw new Error("Inconsistent asset catalog snapshot metadata");
  }
  return payload;
}
