import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    reactCompiler: true, // React 19 Compiler for automatic optimizations
    // ppr: true, // Partial Prerendering - disabled for stable build
  },
  // Fix for Node.js v18 compatibility - moved to top level
  serverExternalPackages: ['ioredis', 'nodemailer'],
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
  }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qvwltjhdjw.cfolks.pl',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600,
    localPatterns: [
      {
        pathname: '/images/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for Next.js 15.5.2 compatibility issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    // Fix for undefined 'call' errors
    config.optimization = {
      ...config.optimization,
      sideEffects: false,
    };
    
    return config;
  },
  transpilePackages: ['@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge'],
  
  // Output configuration for Docker
  output: 'standalone',
  
  // Sentry configuration will be handled by sentry config files
};

export default withBundleAnalyzer(nextConfig);
