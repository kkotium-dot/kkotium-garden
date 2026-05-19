/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
