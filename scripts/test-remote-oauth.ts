import assert from "node:assert/strict";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { verifyOwnerToken } from "../src/remote/oauth-identity.js";

const issuer = "https://identity.example.test/";
const audience = "https://ariadne-remote-mcp.example.test/api/mcp";
const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = await exportJWK(publicKey);
const keySet = createLocalJWKSet({ keys: [{ ...jwk, kid: "fixture-key", alg: "RS256", use: "sig" }] });
const token = await new SignJWT({ scope: "openid profile mcp:access" })
  .setProtectedHeader({ alg: "RS256", kid: "fixture-key" })
  .setIssuer(issuer)
  .setAudience(audience)
  .setSubject("owner-fixture-1")
  .setIssuedAt()
  .setExpirationTime("5m")
  .sign(privateKey);

assert.equal(await verifyOwnerToken(`Bearer ${token}`, { issuer, audience }, keySet), "https://identity.example.test:owner-fixture-1");
const missingScope = await new SignJWT({ scope: "openid profile" })
  .setProtectedHeader({ alg: "RS256", kid: "fixture-key" })
  .setIssuer(issuer).setAudience(audience).setSubject("owner-fixture-1")
  .setIssuedAt().setExpirationTime("5m").sign(privateKey);
assert.equal(await verifyOwnerToken(`Bearer ${missingScope}`, { issuer, audience }, keySet), null);
assert.equal(await verifyOwnerToken(undefined, { issuer, audience }, keySet), null);
assert.equal(await verifyOwnerToken(`Bearer ${token}`, { issuer, audience: `${audience}/other` }, keySet), null);
assert.equal(await verifyOwnerToken(`Bearer ${token}`, { issuer: "https://other.example.test/", audience }, keySet), null);
const expired = await new SignJWT({})
  .setProtectedHeader({ alg: "RS256", kid: "fixture-key" })
  .setIssuer(issuer).setAudience(audience).setSubject("owner-fixture-1")
  .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
  .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
  .sign(privateKey);
assert.equal(await verifyOwnerToken(`Bearer ${expired}`, { issuer, audience }, keySet), null);
console.log("remote OAuth: issuer, audience, MCP scope, subject and expiry checks passed");
