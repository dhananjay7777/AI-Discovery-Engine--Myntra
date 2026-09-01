import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  outputFileTracingIncludes: {
    "/*": ["./data/published/**"],
  },
};

export default nextConfig;
