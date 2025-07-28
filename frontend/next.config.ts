import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.NEXT_PUBLIC_API_URL 
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
          : "http://localhost:8080/api/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "places.googleapis.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
      },
      // Add your EC2 domain for production
      {
        protocol: "https",
        hostname: "ec2-18-216-10-10.us-east-2.compute.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
