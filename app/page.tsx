import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { requiresDesktopSetup } from "@/lib/desktop-setup";

export default async function HomePage() {
  const [session, needsSetup] = await Promise.all([getSession(), requiresDesktopSetup()]);

  if (needsSetup) {
    redirect("/setup");
  }

  redirect(session ? "/overview" : "/login");
}
