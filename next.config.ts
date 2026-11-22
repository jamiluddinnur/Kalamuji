import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/manifest.webmanifest',
      headers: [
        { key: 'Content-Type', value: 'application/manifest+json' },
        { key: 'Cache-Control', value: 'public, max-age=3600' },
      ],
    },
  ],
};

export default nextConfig;
