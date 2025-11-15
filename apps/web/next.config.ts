import type { NextConfig } from 'next';
import path from 'path';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Debug environment variables (only when DEBUG is enabled and only once per process)
const __isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true';
type DebugGlobal = typeof globalThis & { __nextConfigLogged?: boolean };
const debugGlobal = globalThis as DebugGlobal;

if (__isDebug && !debugGlobal.__nextConfigLogged) {
  console.log(
    '🔍 Next.js Config - GTM ID:',
    process.env.NEXT_PUBLIC_GTM_ID ? 'SET' : 'NOT SET'
  );
  console.log(
    '🔍 Next.js Config - GA4 ID:',
    process.env.NEXT_PUBLIC_GA4_ID ? 'SET' : 'NOT SET'
  );
  debugGlobal.__nextConfigLogged = true;
}

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  // Fix for Vercel routes-manifest issue with Next.js 15
  distDir: '.next',
  experimental: {
    // OPTIMIZATION: Enable package import optimization for better tree-shaking
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-slot',
      '@radix-ui/react-popover',
      '@radix-ui/react-accordion',
      '@tanstack/react-query',
      'date-fns',
      'lodash-es',
      'zod',
    ],
    // ppr: true, // Partial Prerendering - requires Next.js canary
  },
  // Fix for Node.js v18 compatibility - moved to top level
  serverExternalPackages: [
    'ioredis',
    'nodemailer',
    'import-in-the-middle',
    'require-in-the-middle',
    '@opentelemetry/instrumentation',
    '@sentry/node-core',
  ],
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
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
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
  webpack: (config, { isServer, dev, dir }) => {
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

    // Resolve workspace packages from monorepo
    // Next.js/Turbopack should resolve workspace packages via pnpm hoisting
    // But we need to ensure webpack can find them during build
    // Use dir parameter from Next.js webpack config (points to apps/web directory)
    const appDir = dir || process.cwd();
    const rootDir = path.resolve(appDir, '../..');
    const sharedPackagePath = path.resolve(rootDir, 'packages/shared');

    // Ensure alias is set for both client and server
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }

    // Set alias to the package directory (not the index.ts file)
    // This allows webpack to resolve subpaths correctly
    config.resolve.alias['@headless-woo/shared'] = sharedPackagePath;

    // Also add root packages directory to modules resolution
    // This helps webpack find workspace packages during build
    if (!config.resolve.modules) {
      config.resolve.modules = ['node_modules'];
    }
    if (Array.isArray(config.resolve.modules)) {
      const packagesDir = path.resolve(rootDir, 'packages');
      // Insert packages directory before node_modules for priority
      if (!config.resolve.modules.includes(packagesDir)) {
        config.resolve.modules = [packagesDir, ...config.resolve.modules];
      }
    }

    // Ensure symlinks are resolved correctly
    config.resolve.symlinks = true;

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
          minSize: 20000,
          maxSize: 200000, // Reduced from 244KB to 200KB for smaller chunks
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
            // Separate chunk for performance monitoring
            monitoring: {
              test: /[\\/]node_modules[\\/](@sentry|@opentelemetry)/,
              name: 'monitoring',
              chunks: 'all',
              priority: 9,
            },
            // OPTIMIZATION: Separate chunks for heavy libraries
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 11,
            },
            radixUI: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 11,
            },
          },
        },
      };
    }

    // Performance optimizations for all environments
    return config;
  },
  transpilePackages: [
    '@headless-woo/shared',
    '@radix-ui/react-slot',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
  ],

  // Output configuration for Vercel
  // output: 'standalone', // Temporarily disabled for Vercel compatibility

  // Sentry configuration will be handled by sentry config files
};

export default withBundleAnalyzer(nextConfig);
