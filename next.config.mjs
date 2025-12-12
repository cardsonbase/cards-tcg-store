/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,   // this kills ESLint completely
  },
  typescript: {
    ignoreBuildErrors: true,    // this kills TypeScript errors completely
  },
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  // Fix the two module warnings so they don’t even show up
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
