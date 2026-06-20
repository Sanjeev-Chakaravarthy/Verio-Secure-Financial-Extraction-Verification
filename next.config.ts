import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warnings do not fail the production build
    ignoreDuringBuilds: false,
    dirs: ["src"],
  },
  typescript: {
    // Type errors are caught in CI separately
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
