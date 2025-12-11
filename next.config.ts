import type { NextConfig } from "next";

// Bundle analyzer configuration - enabled via ANALYZE environment variable
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

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

      // Optimize Monaco Editor code splitting and chunk sizes
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            // Split Monaco Editor into separate chunks
            monaco: {
              test: /[\\/]node_modules[\\/](monaco-editor|@monaco-editor)[\\/]/,
              name: 'monaco-editor',
              chunks: 'async',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Split vendor code into smaller chunks
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
              name(module: any) {
                // Get the name of the package (e.g., node_modules/packageName/not/this/part.js)
                const packageName = module.context?.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
                // npm package names are URL-safe, but some servers don't like @ symbols
                return `npm.${packageName?.replace('@', '')}`;
              },
            },
            // Split common code
            common: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
          // Set max chunk size to 244KB (250000 bytes)
          maxSize: 250000,
        },
      };
    }

    return config;
  },
  // Disable Monaco worker warnings in production
  productionBrowserSourceMaps: false,
};

export default withBundleAnalyzer(nextConfig);
