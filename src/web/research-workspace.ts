import type {
  AssetComparison,
  AgentTokenizedAsset,
  ResearchNextStep,
  ResearchTiming
} from "../domain/agent-types.js";
import { metadataEvidence, type MetadataEvidence } from "../domain/metadata-provenance.js";

export type WorkspaceState = "ready" | "partial" | "empty";

export type WorkspaceLogo = {
  url?: string;
  status: "available" | "unavailable";
  source: AgentTokenizedAsset["metadata"]["source"];
};

export type ResearchWorkspaceRepresentation = {
  id: string;
  issuer: {
    id: string;
    name: string;
    logo: WorkspaceLogo;
  };
  underlying: {
    ticker: string;
    name: string;
    logo: WorkspaceLogo;
  };
  identity: {
    tokenSymbol: string;
    platformId: string;
    chainId: string;
    contractAddress: string;
    matchQuality?: AgentTokenizedAsset["matchQuality"];
  };
  market: {
    tokenPrice?: string;
    referencePrice?: string;
    priceGap?: string;
    priceGapPercent?: string;
    marketStatus: AgentTokenizedAsset["market"] extends infer M
      ? M extends { marketStatus: infer S } ? S : never
      : never;
    openState?: boolean;
    updatedAt?: number;
    liquidity?: string;
    volume24H?: string;
  };
  evidence: {
    completeness: AgentTokenizedAsset["dataQuality"]["completeness"];
    coverage: AgentTokenizedAsset["dataQuality"]["coverage"];
    missingFields: string[];
    warnings: string[];
    links: AgentTokenizedAsset["links"];
  };
  metadataEvidence: MetadataEvidence[];
  comparison: {
    rank?: number;
    eligible: boolean;
    matchReasons: string[];
    excludedReasons: string[];
  };
};

export type ResearchWorkspaceView = {
  kind: "tokenized_stock_research";
  state: WorkspaceState;
  query: {
    ticker: string;
    name: string;
    chainId?: string;
  };
  summary: {
    representationsFound: number;
    eligibleRepresentations: number;
    warningCount: number;
    incompleteRepresentations: number;
  };
  representations: ResearchWorkspaceRepresentation[];
  comparison: {
    criteria: AssetComparison["criteria"];
    summary: string;
    warnings: string[];
  };
  nextSteps: ResearchNextStep[];
  timing?: ResearchTiming;
  boundary: {
    mode: "research";
    sideEffects: "none";
    investmentAdvice: false;
    transactionCreated: false;
    signatureRequested: false;
    broadcastAttempted: false;
  };
};

function logo(url: string | undefined, source: AgentTokenizedAsset["metadata"]["source"]): WorkspaceLogo {
  return url
    ? { url, status: "available", source }
    : { status: "unavailable", source };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function workspaceState(assets: AgentTokenizedAsset[]): WorkspaceState {
  if (!assets.length) return "empty";
  return assets.some((asset) => asset.dataQuality.completeness !== "complete" || asset.dataQuality.warnings.length > 0)
    ? "partial"
    : "ready";
}

function representation(
  asset: AgentTokenizedAsset,
  comparison: AssetComparison
): ResearchWorkspaceRepresentation {
  const row = comparison.rows.find((candidate) => candidate.asset.assetId === asset.assetId);
  const market = asset.market;
  return {
    id: asset.assetId,
    issuer: {
      id: asset.issuer.id,
      name: asset.issuer.name,
      logo: logo(asset.issuer.logoUrl, asset.metadata.source)
    },
    underlying: {
      ticker: asset.underlyingTicker,
      name: asset.underlyingName,
      logo: logo(asset.metadata.underlyingLogoUrl, asset.metadata.source)
    },
    identity: {
      tokenSymbol: asset.tokenSymbol,
      platformId: asset.platformId,
      chainId: asset.chainId,
      contractAddress: asset.contractAddress,
      matchQuality: asset.matchQuality
    },
    market: {
      tokenPrice: market?.tokenPrice,
      referencePrice: market?.referencePrice,
      priceGap: market?.priceGap,
      priceGapPercent: market?.priceGapPercent,
      marketStatus: market?.marketStatus ?? "unknown",
      openState: market?.openState,
      updatedAt: market?.tokenPriceUpdatedAt,
      liquidity: market?.liquidity,
      volume24H: market?.volume24H
    },
    evidence: {
      completeness: asset.dataQuality.completeness,
      coverage: asset.dataQuality.coverage,
      missingFields: [...asset.dataQuality.missingFields],
      warnings: [...asset.dataQuality.warnings],
      links: [...asset.links]
    },
    metadataEvidence: metadataEvidence(asset),
    comparison: {
      rank: row?.rank,
      eligible: Boolean(row && row.excludedReasons.length === 0),
      matchReasons: [...(row?.matchReasons ?? [])],
      excludedReasons: [...(row?.excludedReasons ?? [])]
    }
  };
}

export function buildResearchWorkspaceView(
  assets: AgentTokenizedAsset[],
  comparison: AssetComparison,
  nextSteps: ResearchNextStep[] = [],
  timing?: ResearchTiming,
  queryOverride?: { ticker?: string; name?: string; chainId?: string }
): ResearchWorkspaceView {
  const warnings = unique([
    ...comparison.warnings,
    ...assets.flatMap((asset) => asset.dataQuality.warnings)
  ]);
  const eligibleRepresentations = comparison.rows.filter((row) => row.excludedReasons.length === 0).length;
  return {
    kind: "tokenized_stock_research",
    state: workspaceState(assets),
    query: {
      ticker: queryOverride?.ticker ?? comparison.underlyingTicker,
      name: queryOverride?.name ?? comparison.underlyingName,
      chainId: queryOverride?.chainId ?? (assets.length ? assets[0].chainId : undefined)
    },
    summary: {
      representationsFound: assets.length,
      eligibleRepresentations,
      warningCount: warnings.length,
      incompleteRepresentations: assets.filter((asset) => asset.dataQuality.completeness !== "complete").length
    },
    representations: assets.map((asset) => representation(asset, comparison)),
    comparison: {
      criteria: comparison.criteria,
      summary: comparison.summary,
      warnings
    },
    nextSteps: [...nextSteps],
    timing,
    boundary: {
      mode: "research",
      sideEffects: "none",
      investmentAdvice: false,
      transactionCreated: false,
      signatureRequested: false,
      broadcastAttempted: false
    }
  };
}
