/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn1.domeggook.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn2.domeggook.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'domeggook.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
    domains: ['localhost', 'domeggook.com', 'cdn1.domeggook.com', 'cdn2.domeggook.com'],
    unoptimized: false,
  },
};

module.exports = nextConfig;
