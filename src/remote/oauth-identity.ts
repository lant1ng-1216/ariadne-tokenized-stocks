import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export async function verifyOwnerToken(
  authorization: string | undefined,
  options: { issuer: string; audience: string },
  keySet: JWTVerifyGetKey
): Promise<string | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const issuer = new URL(options.issuer);
  if (issuer.protocol !== "https:" || !options.audience.trim()) throw new Error("Remote OAuth issuer and audience must be configured");
  try {
    const { payload } = await jwtVerify(authorization.slice(7), keySet, {
      issuer: issuer.href,
      audience: options.audience,
      algorithms: ["RS256"],
      clockTolerance: 5
    });
    const scopes = typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [];
    return typeof payload.sub === "string" && payload.sub.length <= 512 && scopes.includes("mcp:access")
      ? `${issuer.origin}:${payload.sub}`
      : null;
  } catch {
    return null;
  }
}

/** Accept only an access token minted for this MCP resource by the configured issuer. */
export async function authenticatedOwner(authorization: string | undefined, options: { issuer: string; audience: string }): Promise<string | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const issuer = new URL(options.issuer);
  if (issuer.protocol !== "https:" || !options.audience.trim()) throw new Error("Remote OAuth issuer and audience must be configured");
  const jwks = createRemoteJWKSet(new URL(".well-known/jwks.json", issuer));
  return verifyOwnerToken(authorization, options, jwks);
}
