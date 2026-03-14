import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Proxy all API calls through Next.js so Railway only needs port 3000
  async rewrites() {
    return [
      { source: "/auth/:path*",    destination: "http://localhost:3001/auth/:path*" },
      { source: "/webinars/:path*", destination: "http://localhost:3001/webinars/:path*" },
      { source: "/admin/:path*",   destination: "http://localhost:3001/admin/:path*" },
    ];
  },
};

export default nextConfig;
