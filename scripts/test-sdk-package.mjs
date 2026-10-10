import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const temporaryRoot = await mkdtemp(join(tmpdir(), "ariadne-sdk-package-"));
const npmCache = join(temporaryRoot, "npm-cache");

function run(command, args, cwd = root, timeoutMs = 180_000) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolveRun({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

try {
  await run("npm", ["run", "build:sdk-package"]);
  const stagedManifest = JSON.parse(await readFile(resolve(root, ".artifacts/sdk-package/package.json"), "utf8"));
  assert.equal(stagedManifest.name, "ariadne-tokenized-stocks");
  assert.deepEqual(Object.keys(stagedManifest.dependencies).sort(), ["undici", "viem"]);
  assert.equal(stagedManifest.bin, undefined);
  assert.deepEqual(Object.keys(stagedManifest.exports), ["."]);

  const pack = await run("npm", ["pack", resolve(root, ".artifacts/sdk-package"), "--pack-destination", temporaryRoot, "--cache", npmCache]);
  const tarball = join(temporaryRoot, pack.stdout.trim().split(/\r?\n/).at(-1));
  await writeFile(join(temporaryRoot, "package.json"), `${JSON.stringify({ name: "ariadne-sdk-consumer", private: true, type: "module" }, null, 2)}\n`);
  await run("npm", ["install", "--ignore-scripts", "--no-package-lock", "--no-audit", "--no-fund", "--cache", npmCache, tarball], temporaryRoot);

  const consumer = `import assert from "node:assert/strict";
import { createServer } from "node:http";
import { BinanceWeb3Client, TokenizedStocksService } from "ariadne-tokenized-stocks";
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  let data;
  if (url.pathname.endsWith("/search")) data = [{ ticker: "NVDA", companyName: "NVIDIA", assets: [
    { platformId: "ondo", binanceChainId: "56", tokenContractAddress: "0x1111111111111111111111111111111111111111", tokenSymbol: "NVDAon" },
    { platformId: "bstock", binanceChainId: "56", tokenContractAddress: "0x2222222222222222222222222222222222222222", tokenSymbol: "NVDAB" }
  ] }];
  else if (url.pathname.endsWith("/platforms")) data = ["ondo", "bstock"].map((platformId) => ({ platformId, chainDistribution: [{ binanceChainId: "56", tokenCount: 1 }] }));
  else if (url.pathname.endsWith("/tokens")) data = [
    { platformId: "ondo", binanceChainId: "56", tokenContractAddress: "0x1111111111111111111111111111111111111111", tokenSymbol: "NVDAon", underlyingTicker: "NVDA", underlyingName: "NVIDIA", statusInfo: { marketStatus: "regular", openState: true } },
    { platformId: "bstock", binanceChainId: "56", tokenContractAddress: "0x2222222222222222222222222222222222222222", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "NVIDIA", statusInfo: { marketStatus: "regular", openState: true } }
  ];
  else if (url.pathname.endsWith("/price")) data = [{ platformId: "bstock", binanceChainId: "56", tokenContractAddress: "0x2222222222222222222222222222222222222222", tokenPrice: "234.50", referencePrice: "234.00", tokenPriceUpdatedAt: 1790928000000 }];
  else { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ code: 0, msg: "success", data, timestamp: 1790928000100, success: true }));
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const service = new TokenizedStocksService(new BinanceWeb3Client({ apiKey: "fixture", apiSecret: "fixture", baseUrl: "http://127.0.0.1:" + address.port, maxRetries: 0 }));
  const assets = await service.search("NVDA", { chainId: "56" });
  assert.deepEqual(assets.map(({ platformId, tokenSymbol }) => ({ platformId, tokenSymbol })), [{ platformId: "ondo", tokenSymbol: "NVDAon" }, { platformId: "bstock", tokenSymbol: "NVDAB" }]);
  const selected = assets.find((asset) => asset.platformId === "bstock");
  assert.ok(selected);
  const context = await service.marketContext(selected);
  assert.equal(context.tokenPrice, "234.50");
  assert.equal(context.asset.tokenSymbol, "NVDAB");
} finally { await new Promise((resolve) => server.close(resolve)); }
console.log("standalone SDK consumer passed");
`;
  await writeFile(join(temporaryRoot, "consumer.mjs"), consumer);
  const result = await run(process.execPath, ["consumer.mjs"], temporaryRoot);
  assert.match(result.stdout, /standalone SDK consumer passed/);
  console.log(JSON.stringify({ stagedManifest: true, leanRuntimeDependencies: true, mcpExecutableExcluded: true, isolatedInstall: true, issuerAwareSearch: true, explicitSelection: "bstock", marketContext: true, passed: true }, null, 2));
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
