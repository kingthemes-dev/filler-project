import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Removed deprecated turbo config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qvwltjhdjw.cfolks.pl',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
  // Ensure proper module resolution
  transpilePackages: ['@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge'],
};

module.exports = withBundleAnalyzer(nextConfig);
