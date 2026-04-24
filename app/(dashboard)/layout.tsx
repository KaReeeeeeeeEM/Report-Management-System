import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardOnboarding } from "@/components/dashboard/dashboard-onboarding";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getSession } from "@/lib/auth";
import { ensureSeedData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await ensureSeedData();
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/35">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardSidebar adminName={session.name} adminEmail={session.email} />
        <div className="flex min-h-screen flex-col">
          <DashboardOnboarding />
          <DashboardHeader adminName={session.name} />
          <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
