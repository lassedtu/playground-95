import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // @react95/icons' index re-exports ~1,800 icons (4 MB of JS). This rewrites
    // `import { Logo } from "@react95/icons"` (ours and @react95/core's) to
    // per-icon imports, so only the icons in use are bundled.
    optimizePackageImports: ["@react95/icons"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
