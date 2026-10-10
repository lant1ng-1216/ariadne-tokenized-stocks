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
await cp(resolve(root, "README.md"), resolve(destination, "README.md"));
await cp(resolve(root, "LICENSE"), resolve(destination, "LICENSE"));
await cp(resolve(root, "docs/SDK_USAGE.md"), resolve(destination, "docs/SDK_USAGE.md"));

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
  files: ["dist-package", "README.md", "LICENSE", "docs/SDK_USAGE.md"],
  dependencies: {
    undici: sourceManifest.dependencies.undici,
    viem: sourceManifest.dependencies.viem
  },
  publishConfig: { access: "public" }
};

await writeFile(resolve(destination, "package.json"), `${JSON.stringify(sdkManifest, null, 2)}\n`);
console.log(JSON.stringify({ destination, package: sdkManifest.name, version: sdkManifest.version, runtimeDependencies: Object.keys(sdkManifest.dependencies) }, null, 2));
