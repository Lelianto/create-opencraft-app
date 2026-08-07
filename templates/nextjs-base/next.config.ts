import type { NextConfig } from "next";
import { securityHeaders } from "./src/config/security";

const nextConfig: NextConfig = {
  // Fail the production build on type errors instead of shipping them.
  typescript: { ignoreBuildErrors: false },

  // Emit a minimal self-contained runtime tree (.next/standalone) so the app
  // can be deployed with a plain `node server.js` in a Docker image or a
  // standalone server. Harmless for `next dev` and for platform builds.
  output: "standalone",

  // Applied to every route, including Route Handlers and static assets.
  // See src/config/security.ts for the rationale and the documented limits.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
