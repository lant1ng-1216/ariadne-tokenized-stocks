import type { NextConfig } from "next";

const apiOrigin = process.env.ARIADNE_API_ORIGIN ?? "http://127.0.0.1:18902";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  }
};

export default nextConfig;
