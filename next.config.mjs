// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.imgur.com", pathname: "/**" },
      { protocol: "https", hostname: "imgur.com", pathname: "/**" },
    ],
  },

  webpack(config) {
    // Silence warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    // THIS KILLS THE 30 TURBOPACK ERRORS FOREVER
    config.module.rules.push({
      test: /\.(test|spec|bench)\.(js|mjs|ts)$/,
      include: /node_modules/,
      loader: "null-loader",
    });

    return config;
  },
};

export default nextConfig;