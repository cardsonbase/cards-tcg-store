import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,        // kills all ESLint errors
  },
  typescript: {
    ignoreBuildErrors: true,         // kills all TypeScript errors
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@metamask/sdk"], // fixes the React-Native async-storage error
  experimental: {
    serverComponentsExternalPackages: ["pino"], // fixes pino-pretty error
  },
};

export default nextConfig;
