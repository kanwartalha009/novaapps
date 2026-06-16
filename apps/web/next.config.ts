import type { NextConfig } from "next";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000/v1";

const nextConfig: NextConfig = {
  transpilePackages: ["@nova/shared"],
  async rewrites() {
    // Same-origin /api/* → NestJS API so httpOnly auth cookies stay first-party.
    return [{ source: "/api/:path*", destination: `${API_PROXY_TARGET}/:path*` }];
  },
};

export default nextConfig;
