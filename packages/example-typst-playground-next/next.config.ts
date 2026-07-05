import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    lockDistDir: false,
  },
  webpack(config) {
    config.module.rules.unshift({
      test: /typst-wasm[\\/]dist[\\/]worker[\\/]node\.js$/i,
      type: "asset/resource",
      generator: {
        filename: "static/media/[name].[contenthash:8].mjs",
      },
    });

    config.module.rules.push({
      test: /\.(otf|wasm)$/i,
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;
