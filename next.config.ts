import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pnpm dev` from other devices on the home network (e.g. a phone at
  // http://192.168.86.75:3000). Hostnames only; each * is one part.
  allowedDevOrigins: ["192.168.*.*"],
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
