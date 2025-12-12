// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint/TS errors during build (as you had)
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

  // Force Webpack for builds (disables Turbopack globally — fixes thread-stream errors)
  experimental: {
    turbopack: false,  // Official way to disable (Next.js 16 docs)
  },

  webpack: (config) => {
    // Silence pino-pretty fallback (from your dev script)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    // Ignore WalletConnect/Pino test files (null-loader skips them)
    config.module.rules.push({
      test: /\.(test|bench|spec)\.(js|ts|mjs)$/,
      include: /node_modules/,
      use: 'null-loader',
    });

    return config;
  },
};

export default nextConfig;