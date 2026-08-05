import type { NextConfig } from "next";
import { securityHeaders } from "./src/config/security";

const nextConfig: NextConfig = {
  // Fail the production build on type errors instead of shipping them.
  typescript: { ignoreBuildErrors: false },

  // Applied to every route, including Route Handlers and static assets.
  // See src/config/security.ts for the rationale and the documented limits.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
