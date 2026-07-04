import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    lockDistDir: false,
  },
  serverExternalPackages: [
    "@typst-wasm/engine-wasm",
    "@typst-wasm/fonts",
    "typst-wasm",
  ],
  webpack(config) {
    config.module.rules.push({
      test: /\.(otf|wasm)$/i,
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;
