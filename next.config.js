/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Skip static generation for dynamic API routes
  output: 'standalone',
  // Configure dynamic routes
  experimental: {
    // Disable static generation for specific routes
    workerThreads: false,
    cpus: 1
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
    }
    return config;
  },
}