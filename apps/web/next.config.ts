import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@svity/contracts", "@svity/tokens", "@svity/i18n"],
  images: { formats: ["image/avif", "image/webp"] },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
