import { NextResponse } from "next/server";

import { isDesktopEmbeddedMode } from "@/lib/desktop-db";
import { readDesktopSetupState, requiresDesktopSetup } from "@/lib/desktop-setup";
import { detectMongoDbInstallation } from "@/lib/mongodb-detection";

export async function GET() {
  if (!isDesktopEmbeddedMode()) {
    return NextResponse.json({
      desktopMode: false,
      requiresSetup: false,
      setupState: null,
      mongo: null,
    });
  }

  const [setupState, needsSetup, mongo] = await Promise.all([
    readDesktopSetupState(),
    requiresDesktopSetup(),
    detectMongoDbInstallation(),
  ]);

  return NextResponse.json({
    desktopMode: true,
    requiresSetup: needsSetup,
    setupState,
    mongo,
  });
}
