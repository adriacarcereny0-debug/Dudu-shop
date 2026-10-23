import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/img/**", search: "" }],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
};

export default nextConfig;
