import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createWalletHandoffRelayServer } from "../src/mcp/wallet-handoff-relay-server.js";
import { ensureWalletHandoffRelayReady, probeWalletHandoffRelay } from "../src/mcp/wallet-handoff-relay-readiness.js";

const secret = "deterministic-relay-readiness-secret-with-32-characters";

const disabled = await ensureWalletHandoffRelayReady({});
assert.equal(disabled.status, "unavailable");
assert.equal(disabled.mode, "disabled");
assert.match(disabled.reason, /URL and service secret/i);

const hosted = await ensureWalletHandoffRelayReady({
  ARIADNE_WALLET_HANDOFF_RELAY_URL: "https://wallet.example.invalid",
  ARIADNE_WALLET_HANDOFF_RELAY_SECRET: secret
}, { fetcher: async () => { throw new Error("fixture unavailable"); } });
assert.equal(hosted.status, "unavailable");
assert.equal(hosted.mode, "hosted");
assert.match(hosted.reason, /Hosted wallet handoff relay is unreachable/);

const existingRelay = await createWalletHandoffRelayServer({
  host: "127.0.0.1",
  port: 0,
  portalOrigin: "http://127.0.0.1:0",
  serviceSecret: secret
});
const existingAddress = existingRelay.server.address();
assert.ok(existingAddress && typeof existingAddress === "object");
const existingOrigin = `http://127.0.0.1:${existingAddress.port}`;
try {
  const existing = await ensureWalletHandoffRelayReady({
    ARIADNE_WALLET_HANDOFF_RELAY_URL: existingOrigin,
    ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN: existingOrigin,
    ARIADNE_WALLET_HANDOFF_RELAY_SECRET: secret
  });
  assert.equal(existing.status, "ready");
  assert.equal(existing.mode, "existing");
  assert.equal(existing.server, undefined, "a healthy independently managed relay is reused, not adopted");
} finally {
  existingRelay.server.close();
}

const portReservation = createServer();
portReservation.listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => {
  portReservation.once("listening", resolve);
  portReservation.once("error", reject);
});
const reservedAddress = portReservation.address();
assert.ok(reservedAddress && typeof reservedAddress === "object");
const embeddedPort = reservedAddress.port;
await new Promise<void>((resolve) => portReservation.close(() => resolve()));
const embeddedOrigin = `http://127.0.0.1:${embeddedPort}`;
const tempRoot = mkdtempSync(join(tmpdir(), "ariadne-relay-readiness-"));
const embedded = await ensureWalletHandoffRelayReady({
  ARIADNE_WALLET_HANDOFF_RELAY_URL: embeddedOrigin,
  ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN: embeddedOrigin,
  ARIADNE_WALLET_HANDOFF_RELAY_SECRET: secret,
  ARIADNE_WALLET_HANDOFF_STORE_PATH: join(tempRoot, "sessions.json")
});
assert.equal(embedded.status, "ready");
assert.equal(embedded.mode, "embedded");
assert.ok(embedded.server, "the MCP owns the relay it starts");
assert.deepEqual(await probeWalletHandoffRelay(embeddedOrigin), { ready: true });
await new Promise<void>((resolve) => embedded.server!.close(() => resolve()));
assert.equal((await probeWalletHandoffRelay(embeddedOrigin)).ready, false, "closing the MCP-owned server closes the relay lifecycle");

const mismatch = await ensureWalletHandoffRelayReady({
  ARIADNE_WALLET_HANDOFF_RELAY_URL: "http://127.0.0.1:43210",
  ARIADNE_WALLET_HANDOFF_PORTAL_ORIGIN: "http://127.0.0.1:43211",
  ARIADNE_WALLET_HANDOFF_RELAY_SECRET: secret
}, { fetcher: async () => { throw new Error("fixture unavailable"); } });
assert.equal(mismatch.status, "unavailable");
assert.match(mismatch.reason, /same origin/i);

console.log("Relay readiness passed: disabled and hosted diagnostics, healthy reuse, embedded loopback startup, lifecycle shutdown and origin validation.");
