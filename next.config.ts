import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (required for Next.js 16+)
  // Empty config to silence webpack/turbopack warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Monaco Editor worker configuration
    // Copy Monaco workers to /_next/static for proper loading
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  // Disable Monaco worker warnings in production
  productionBrowserSourceMaps: false,
};

export default nextConfig;
