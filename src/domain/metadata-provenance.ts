import type { AgentTokenizedAsset, AssetMetadata, Issuer } from "./agent-types.js";

export type MetadataEvidenceField = "underlyingLogoUrl" | "issuerLogoUrl" | "issuerLinks";

export type MetadataEvidence = {
  field: MetadataEvidenceField;
  status: "available" | "unavailable";
  source: AssetMetadata["source"];
  value?: string | string[];
  explanation: string;
};

export function metadataEvidence(asset: AgentTokenizedAsset): MetadataEvidence[] {
  const source = asset.metadata.source;
  return [
    asset.metadata.underlyingLogoUrl
      ? {
          field: "underlyingLogoUrl",
          status: "available",
          source,
          value: asset.metadata.underlyingLogoUrl,
          explanation: "Underlying-asset logo was supplied by the metadata source."
        }
      : {
          field: "underlyingLogoUrl",
          status: "unavailable",
          source,
          explanation: "No underlying-asset logo was supplied; Ariadne does not infer one from a ticker."
        },
    asset.metadata.issuerLogoUrl
      ? {
          field: "issuerLogoUrl",
          status: "available",
          source,
          value: asset.metadata.issuerLogoUrl,
          explanation: "Issuer logo was supplied by the metadata source."
        }
      : {
          field: "issuerLogoUrl",
          status: "unavailable",
          source,
          explanation: "No issuer logo was supplied; Ariadne does not infer one from a platform name."
        },
    asset.issuer.links.length
      ? {
          field: "issuerLinks",
          status: "available",
          source,
          value: asset.issuer.links.map((link) => link.url),
          explanation: "Issuer links are available as explicit references."
        }
      : {
          field: "issuerLinks",
          status: "unavailable",
          source,
          explanation: "No issuer links were supplied by the metadata source."
        }
  ];
}
