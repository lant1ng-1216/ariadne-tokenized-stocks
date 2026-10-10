import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const destination = resolve(root, ".artifacts/mcp-package");
const sourceManifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

await rm(destination, { recursive: true, force: true });
await mkdir(resolve(destination, "dist/mcp/ui"), { recursive: true });
await mkdir(resolve(destination, "docs"), { recursive: true });
await cp(resolve(root, ".artifacts/mcp-build"), resolve(destination, "dist"), { recursive: true });
for (const cssFile of ["catalog-app.css", "purchase-approval-app.css", "research-app.css"]) {
  await cp(resolve(root, "src/mcp/ui", cssFile), resolve(destination, "dist/mcp/ui", cssFile));
}
await cp(resolve(root, "README.md"), resolve(destination, "README.md"));
await cp(resolve(root, "LICENSE"), resolve(destination, "LICENSE"));
await cp(resolve(root, "docs/MCP_USAGE.md"), resolve(destination, "docs/MCP_USAGE.md"));

const runtimeDependencyNames = [
  "@metamask/connect-evm", "@modelcontextprotocol/ext-apps", "@modelcontextprotocol/ext-apps-v1",
  "@modelcontextprotocol/node", "@modelcontextprotocol/server", "@walletconnect/universal-provider", "esbuild", "lightweight-charts",
  "qrcode", "three", "undici", "viem", "zod"
];
const dependencies = Object.fromEntries(runtimeDependencyNames.map((name) => {
  const version = sourceManifest.dependencies[name] ?? sourceManifest.devDependencies[name];
  if (!version) throw new Error(`Missing MCP package dependency version: ${name}`);
  return [name, version];
}));

const manifest = {
  name: "ariadne-tokenized-stocks-mcp",
  version: sourceManifest.version,
  description: "Executable stdio MCP server for Ariadne tokenized-stock research and guarded workflows",
  license: sourceManifest.license,
  repository: sourceManifest.repository,
  homepage: sourceManifest.homepage,
  type: "module",
  engines: sourceManifest.engines,
  bin: { "ariadne-mcp": "./dist/mcp/server.js" },
  files: ["dist", "README.md", "LICENSE", "docs/MCP_USAGE.md"],
  dependencies,
  publishConfig: { access: "public" }
};

await writeFile(resolve(destination, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ destination, package: manifest.name, version: manifest.version, executable: manifest.bin["ariadne-mcp"], runtimeDependencies: Object.keys(dependencies) }, null, 2));
