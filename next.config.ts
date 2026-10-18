import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // OpenNext needs both Prisma packages available when it creates the
  // Cloudflare workerd bundle.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/.prisma/client/query_compiler_bg.wasm"]
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
      // Microsoft Dev Tunnels preserve the public browser origin while
      // forwarding the request to localhost. Keep this exception development-only.
      allowedOrigins: process.env.NODE_ENV === "development" ? ["*.asse.devtunnels.ms"] : []
    }
  }
};

export default nextConfig;
