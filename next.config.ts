import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Anchor Turbopack to this project instead of an unrelated parent lockfile.
  turbopack: {
    root: process.cwd(),
  },
  compress: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/plans",
        destination: "/pricing",
        permanent: true,
      },
      {
        source: "/stem",
        destination: "/classroom/stem",
        permanent: true,
      },
      {
        source: "/arena",
        destination: "/challenge-arena",
        permanent: true,
      },
      {
        source: "/products/ai-study",
        destination: "/products/ai-learning",
        permanent: true,
      },
      {
        source: "/products/arena",
        destination: "/products/challenge-arena",
        permanent: true,
      },
      {
        source: "/tutors",
        destination: "/for-tutors",
        permanent: true,
      },
      {
        source: "/courses",
        destination: "/learn",
        permanent: true,
      },
      {
        source: "/student/dashboard",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/student/cbt",
        destination: "/cbt",
        permanent: true,
      },
      {
        source: "/student/learning",
        destination: "/learn",
        permanent: true,
      },
      {
        source: "/student/results",
        destination: "/result",
        permanent: true,
      },
      {
        source: "/student/profile",
        destination: "/profile",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
