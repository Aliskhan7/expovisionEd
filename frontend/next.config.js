/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during builds
    ignoreBuildErrors: true,
  },
  images: {
    // Allow external images
    domains: ['example.com'],
  },
  // Enable standalone output for Docker
  output: 'standalone',
}

module.exports = nextConfig

