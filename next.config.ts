// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    config.module.rules.push({
      test: /\.(test|spec|bench)\.(js|mjs|ts)$/,
      include: /node_modules/,
      loader: "null-loader",
    });

    return config;
  },
};

export default nextConfig;