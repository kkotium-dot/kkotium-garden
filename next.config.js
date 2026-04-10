/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Native addons (bcrypt) must not be bundled by Next.js — Next.js 14 key
  experimental: {
    serverComponentsExternalPackages: ['bcrypt'],
  },

  // Image config — allow all remote patterns + unoptimized for local PNGs
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
};

module.exports = nextConfig;
