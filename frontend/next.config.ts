import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:8601/api/:path*" },
      { source: "/uploads/:path*", destination: "http://127.0.0.1:8601/uploads/:path*" },
    ];
  },
};

export default nextConfig;
