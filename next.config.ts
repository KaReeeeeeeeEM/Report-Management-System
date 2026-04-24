import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    output: phase === PHASE_DEVELOPMENT_SERVER ? undefined : "standalone",
    serverExternalPackages: [
      "mongodb",
      "mongoose",
      "mongodb-memory-server",
      "mongodb-memory-server-core",
    ],
    typedRoutes: true,
  };
}
