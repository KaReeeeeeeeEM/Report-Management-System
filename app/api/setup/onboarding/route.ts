import { NextResponse } from "next/server";

import { isDesktopEmbeddedMode } from "@/lib/desktop-db";
import { readDesktopSetupState, writeDesktopSetupState } from "@/lib/desktop-setup";

export async function POST() {
  if (!isDesktopEmbeddedMode()) {
    return NextResponse.json({ ok: true });
  }

  const setupState = await readDesktopSetupState();

  if (!setupState.showOnboarding) {
    return NextResponse.json({ ok: true });
  }

  await writeDesktopSetupState({
    ...setupState,
    showOnboarding: false,
  });

  return NextResponse.json({ ok: true });
}
