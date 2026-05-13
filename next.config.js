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
    // 排除 Tabby.app 等无关目录，避免 Watchpack 报错
    config.watchOptions = config.watchOptions || {};
    config.watchOptions.ignored = [
      /node_modules/,
      /\.next/,
      /Applications\/Tabby\.app\/.*/,
      /\.git\/.*/,
      /Library\/.*/
    ];
    return config;
  },
}