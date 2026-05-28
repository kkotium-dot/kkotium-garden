/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Trace the bundled Pretendard OTF into the serverless functions that
  // rasterize SVG text via Sharp/librsvg, so fontconfig can find Korean glyphs
  // at runtime (otherwise Korean renders as tofu on Vercel Linux). Keyed by the
  // app-router route paths that composite text overlays.
  experimental: {
    outputFileTracingIncludes: {
      '/api/thumbnail/[sku]': ['./fonts/**/*'],
      '/api/products/[id]/generate-detail': ['./fonts/**/*'],
    },
  },

  images: {
    unoptimized: true,
    domains: ['localhost', 'kkotium.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },

  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },

  webpack: (config, { isServer }) => {
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

  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/.well-known/:path*', destination: '/404' },
      ],
      fallback: [],
    };
  },

  async redirects() {
    return [
      // Sprint 8-IA Phase 1: /automation demoted to /admin/automation (admin only).
      // Per #46 (false-label ban) — registry shows real-cron only.
      { source: '/automation', destination: '/admin/automation', permanent: true },
    ];
  },
};

module.exports = nextConfig;
