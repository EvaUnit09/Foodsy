import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        hostname: "ec2-52-91-255-196.compute-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
