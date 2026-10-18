import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Anchor Turbopack to this project instead of an unrelated parent lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
