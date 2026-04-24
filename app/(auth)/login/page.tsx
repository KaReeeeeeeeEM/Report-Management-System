import { redirect } from "next/navigation";
import { FolderOpen, LockKeyhole } from "lucide-react";

import { LoginForm } from "@/components/dashboard/login-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureSeedData } from "@/lib/data";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureSeedData();
  const session = await getSession();

  if (session) {
    redirect("/overview");
  }
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="panel-grid absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_34%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="flex flex-col justify-center gap-8">
            <Badge className="w-fit rounded-full bg-primary px-4 py-1.5 text-primary-foreground">
              Report Management System
            </Badge>

            <div className="space-y-5">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Keep your reports in one place and find them when you need them.
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                Sign in to upload reports, view them anytime, and keep track of what was added, opened, or removed.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border/70 bg-card/70 shadow-panel backdrop-blur">
                <CardHeader className="space-y-3">
                  <FolderOpen className="h-5 w-5 text-foreground" />
                  <CardTitle className="text-lg">Get started</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Sign in to add new reports and keep each project in one place.</p>
                  <p>Open any report later, download it, or update its details when needed.</p>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/70 shadow-panel backdrop-blur">
                <CardHeader className="space-y-3">
                  <LockKeyhole className="h-5 w-5 text-foreground" />
                  <CardTitle className="text-lg">Stay in control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Keep track of what was added, opened, or removed.</p>
                  <p>Recover deleted reports anytime from the recycle bin.</p>
                  <p>Your sign-in details are not shown on this screen.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="flex items-center justify-center lg:justify-end">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
