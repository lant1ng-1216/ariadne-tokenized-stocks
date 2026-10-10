import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const destination = resolve(root, ".artifacts/sdk-package");
const sourceManifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

await rm(destination, { recursive: true, force: true });
await mkdir(resolve(destination, "docs"), { recursive: true });
await cp(resolve(root, "dist-package"), resolve(destination, "dist-package"), { recursive: true });
await rm(resolve(destination, "dist-package/mcp"), { recursive: true, force: true });
await mkdir(resolve(destination, "dist-package/mcp"), { recursive: true });
for (const suffix of [".js", ".d.ts", ".d.ts.map"]) {
  await cp(resolve(root, `dist-package/mcp/plan-registry${suffix}`), resolve(destination, `dist-package/mcp/plan-registry${suffix}`));
}
await rm(resolve(destination, "dist-package/web"), { recursive: true, force: true });
await rm(resolve(destination, "dist-package/observability"), { recursive: true, force: true });
const repositoryReadme = await readFile(resolve(root, "README.md"), "utf8");
const packageReadme = repositoryReadme.replace(/\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g, "](" + "https://github.com/lant1ng-1216/ariadne-tokenized-stocks/blob/main/" + "$1)");
await writeFile(resolve(destination, "README.md"), packageReadme);
await cp(resolve(root, "LICENSE"), resolve(destination, "LICENSE"));
await cp(resolve(root, "docs/SDK_USAGE.md"), resolve(destination, "docs/SDK_USAGE.md"));
await cp(resolve(root, "API_CONFIGURATION.md"), resolve(destination, "API_CONFIGURATION.md"));
await cp(resolve(root, "docs/MCP_USAGE.md"), resolve(destination, "docs/MCP_USAGE.md"));
await cp(resolve(root, "docs/ARIADNE_WALLET_HOST_BRIDGE.md"), resolve(destination, "docs/ARIADNE_WALLET_HOST_BRIDGE.md"));
await cp(resolve(root, "docs/REMOTE_MCP_DEPLOYMENT.md"), resolve(destination, "docs/REMOTE_MCP_DEPLOYMENT.md"));

const sdkManifest = {
  name: sourceManifest.name,
  version: sourceManifest.version,
  description: "TypeScript SDK for issuer-aware tokenized-stock research and guarded BNB Chain workflows",
  license: sourceManifest.license,
  repository: sourceManifest.repository,
  homepage: sourceManifest.homepage,
  type: "module",
  engines: sourceManifest.engines,
  main: "./dist-package/index.js",
  types: "./dist-package/index.d.ts",
  exports: {
    ".": {
      types: "./dist-package/index.d.ts",
      import: "./dist-package/index.js"
    }
  },
  files: ["dist-package", "README.md", "LICENSE", "API_CONFIGURATION.md", "docs/SDK_USAGE.md", "docs/MCP_USAGE.md", "docs/ARIADNE_WALLET_HOST_BRIDGE.md", "docs/REMOTE_MCP_DEPLOYMENT.md"],
  dependencies: {
    undici: sourceManifest.dependencies.undici,
    viem: sourceManifest.dependencies.viem
  },
  publishConfig: { access: "public" }
};

await writeFile(resolve(destination, "package.json"), `${JSON.stringify(sdkManifest, null, 2)}\n`);
console.log(JSON.stringify({ destination, package: sdkManifest.name, version: sdkManifest.version, runtimeDependencies: Object.keys(sdkManifest.dependencies) }, null, 2));
