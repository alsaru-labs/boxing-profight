import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY || "",
  },
};

export default nextConfig;
