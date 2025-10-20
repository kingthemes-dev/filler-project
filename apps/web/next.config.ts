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
  // Fix for Vercel routes-manifest issue with Next.js 15
  distDir: '.next',
      experimental: {
        // Temporary: disable experimental features for stable Vercel deployment
        // optimizePackageImports: false, // Disabled for Vercel stability
        // ppr: true, // Partial Prerendering - requires Next.js canary
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
      webpack: (config, { isServer, dev }) => {
        // Fix for Next.js 15.5.2 compatibility issues
        if (!isServer) {
          config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
            crypto: false,
            dns: false,
            child_process: false,
            cluster: false,
            os: false,
            path: false,
            stream: false,
            util: false,
            url: false,
            querystring: false,
            buffer: false,
            events: false,
            assert: false,
            constants: false,
            domain: false,
            http: false,
            https: false,
            vm: false,
            zlib: false,
          };
        }
    
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    // Advanced optimization for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        sideEffects: false,
        usedExports: true,
        concatenateModules: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
            utils: {
              test: /[\\/]src[\\/]utils[\\/]/,
              name: 'utils',
              chunks: 'all',
              priority: 8,
            },
            components: {
              test: /[\\/]src[\\/]components[\\/]/,
              name: 'components',
              chunks: 'all',
              priority: 7,
            },
          },
        },
      };
    }
    
    return config;
  },
  transpilePackages: ['@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge'],
  
  // Output configuration for Vercel
  // output: 'standalone', // Temporarily disabled for Vercel compatibility
  
  // Sentry configuration will be handled by sentry config files
};

export default withBundleAnalyzer(nextConfig);
