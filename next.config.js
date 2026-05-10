/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // sql.js needs wasm file accessible on server
      config.externals = config.externals || [];
      // Don't bundle sql.js wasm on server side
    }
    return config;
  },
}

module.exports = nextConfig