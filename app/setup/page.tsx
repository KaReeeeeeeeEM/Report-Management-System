import { redirect } from "next/navigation";

import { DesktopSetupWizard } from "@/components/setup/desktop-setup-wizard";
import { getSession } from "@/lib/auth";
import { isDesktopEmbeddedMode } from "@/lib/desktop-db";
import { getDefaultDeviceName, readDesktopSetupState, requiresDesktopSetup } from "@/lib/desktop-setup";
import { detectMongoDbInstallation } from "@/lib/mongodb-detection";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!isDesktopEmbeddedMode()) {
    redirect("/login");
  }

  const [session, needsSetup, setupState, mongo] = await Promise.all([
    getSession(),
    requiresDesktopSetup(),
    readDesktopSetupState(),
    detectMongoDbInstallation(),
  ]);

  if (!needsSetup) {
    redirect(session ? "/overview" : "/login");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <DesktopSetupWizard
          initialState={setupState}
          mongo={mongo}
          defaultDeviceName={getDefaultDeviceName()}
        />
      </div>
    </main>
  );
}
