import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export default {
  outputFileTracingRoot: root,
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/approve", destination: "/api/relay?route=/approve" },
      { source: "/healthz", destination: "/api/relay?route=/healthz" },
      { source: "/api/internal/:path*", destination: "/api/relay?route=/api/internal/:path*" },
      { source: "/api/handoffs/:path*", destination: "/api/relay?route=/api/handoffs/:path*" }
    ];
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"]
    };
    return config;
  }
};
