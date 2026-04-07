import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.rightmove.co.uk',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/img/:path*',
        destination: 'https://media.rightmove.co.uk/:path*',
      },
    ]
  },
}

export default nextConfig
