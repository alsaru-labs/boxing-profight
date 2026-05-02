import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_BOXING_AWR_KEY: process.env.NEXT_BOXING_AWR_KEY || "",
  },
  logging: false,
  async redirects() {
    return [
      {
        source: "/register",
        destination: "/login",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
