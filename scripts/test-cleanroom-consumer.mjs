import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const repo = process.cwd();
const tempRoot = await mkdtemp(join(tmpdir(), "ariadne-consumer-"));

function run(command, args, cwd = repo) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${stdout}\n${stderr}`)));
  });
}

try {
  await run("npm", ["run", "build"]);
  const pack = await run("npm", ["pack", "--pack-destination", tempRoot, "--cache", "/private/tmp/ariadne-npm-cache"]);
  const tarballName = pack.stdout.trim().split("\n").at(-1);
  assert.ok(tarballName?.endsWith(".tgz"), `Unexpected npm pack output: ${pack.stdout}`);
  const tarball = join(tempRoot, tarballName);
  await writeFile(join(tempRoot, "package.json"), JSON.stringify({ name: "ariadne-cleanroom-consumer", private: true, type: "module" }, null, 2));
  await run("npm", ["install", "--ignore-scripts", "--no-package-lock", "--cache", "/private/tmp/ariadne-npm-cache", tarball], tempRoot);

  const runtime = `import assert from "node:assert/strict";
import { BinanceWeb3Client, BinanceWeb3Error, TokenizedStocksService, compareAgentAssets } from "ariadne-tokenized-stocks";
const observations = [];
const client = new BinanceWeb3Client({ apiKey: "cleanroom", apiSecret: "cleanroom", baseUrl: "http://127.0.0.1", maxRetries: 0, retryBaseDelayMs: 5, timeoutMs: 1000, onRequest: (event) => observations.push(event) });
assert.equal(typeof client.get, "function");
assert.equal(typeof TokenizedStocksService, "function");
assert.equal(typeof compareAgentAssets, "function");
const error = new BinanceWeb3Error("blocked", 400, "INVALID_REQUEST", false, { field: "symbol" });
assert.equal(error.status, 400);
assert.equal(error.code, "INVALID_REQUEST");
assert.equal(error.retryable, false);
assert.deepEqual(error.details, { field: "symbol" });
assert.deepEqual(observations, []);
console.log("cleanroom runtime import passed");
`;
  await writeFile(join(tempRoot, "consumer.mjs"), runtime);
  const runtimeResult = await run(process.execPath, ["consumer.mjs"], tempRoot);
  assert.match(runtimeResult.stdout, /cleanroom runtime import passed/);

  const typecheck = `import { BinanceWeb3Client, BinanceWeb3Error, TokenizedStocksService, type BinanceWeb3Config, type RequestObservation } from "ariadne-tokenized-stocks";
const observations: RequestObservation[] = [];
const config: BinanceWeb3Config = { apiKey: "cleanroom", apiSecret: "cleanroom", baseUrl: "https://example.invalid", proxyUrl: "http://127.0.0.1:8080", maxRetries: 0, retryBaseDelayMs: 5, timeoutMs: 1000, onRequest: (event) => observations.push(event) };
const client = new BinanceWeb3Client(config);
const stocks = new TokenizedStocksService(client);
const error = new BinanceWeb3Error("blocked", 400, "INVALID_REQUEST", false);
void error.status;
void error.code;
void error.retryable;
void error.details;
void stocks;
void observations;
`;
  await writeFile(join(tempRoot, "consumer.ts"), typecheck);
  await run(join(repo, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "consumer.ts"], tempRoot);

  const manifest = JSON.parse(await readFile(join(tempRoot, "node_modules/ariadne-tokenized-stocks/package.json"), "utf8"));
  assert.equal(manifest.name, "ariadne-tokenized-stocks");
  assert.equal(manifest.engines?.node, ">=22.19.0");
  assert.ok(manifest.exports["."]);
  console.log(JSON.stringify({ packageInstalled: true, runtimeImport: true, typeDeclarations: true, packageRootExports: true, nodeEngine: manifest.engines.node, passed: true }, null, 2));
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
