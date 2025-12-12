// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: { 
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgur.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "imgur.com",
        pathname: "/**",
      },
    ],
  },

  // Stable Turbopack config (empty = default; no experimental needed in v16)
  turbopack: {},

  webpack: (config) => {
    // Silence pino-pretty fallback
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    // Ignore WalletConnect test files (fixes thread-stream/tap/desm)
    config.module.rules.push({
      test: /\.(test|bench|spec)\.(js|ts|mjs)$/,
      include: /node_modules/,
      use: 'null-loader',
    });

    return config;
  },
};

export default nextConfig;