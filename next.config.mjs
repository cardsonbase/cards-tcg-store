// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
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

  // Force Webpack for production builds (skips Turbopack bugs with WalletConnect)
  experimental: {
    turbo: {
      loaders: false,  // Disables Turbopack loaders that cause test file errors
    },
  },

  webpack: (config) => {
    // Silence pino-pretty fallback (from your dev script)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    // Ignore WalletConnect test files (fixes thread-stream/tap/desm errors)
    config.module.rules.push({
      test: /\.(test|bench|spec)\.(js|ts|mjs)$/,
      include: /node_modules/,
      loader: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;