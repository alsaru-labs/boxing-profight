import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_BOXING_AWR_KEY: process.env.NEXT_BOXING_AWR_KEY || "",
  },
};

export default nextConfig;
