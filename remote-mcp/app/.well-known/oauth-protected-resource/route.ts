import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const issuer = process.env.ARIADNE_OAUTH_ISSUER;
  const resource = process.env.ARIADNE_OAUTH_AUDIENCE;
  if (!issuer || !resource) return NextResponse.json({ error: "oauth_not_configured" }, { status: 503 });
  return NextResponse.json({
    resource,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:access"]
  }, { headers: { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" } });
}
