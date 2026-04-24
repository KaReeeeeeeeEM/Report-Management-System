import { redirect } from "next/navigation";
import Image from "next/image";
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
    <main className="min-h-screen bg-black/50 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-2xl bg-card shadow-panel lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden min-h-[720px] overflow-hidden lg:block">
          <Image
            src="/1.svg"
            alt="Report Management System visual"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1024px) 58vw, 100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.16),rgba(10,10,10,0.72))]" />
          <div className="absolute inset-x-0 top-0 p-8 xl:p-10">
            <div className="max-w-xl space-y-5">
              <Badge className="w-fit rounded-full border border-white/20 bg-white/12 px-4 py-1.5 text-white backdrop-blur">
                Report Management System
              </Badge>
              <div className="space-y-3 text-white">
                <h1 className="text-4xl font-semibold sm:text-5xl">
                  Report Management System
                </h1>
                <p className="max-w-lg text-base text-white/78 sm:text-lg">
                  Manage reports, keep project documents organized, and track what was uploaded, viewed, recovered, or removed.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-white/12 bg-black/30 shadow-none backdrop-blur">
                <CardHeader className="space-y-3">
                  <FolderOpen className="h-5 w-5 text-white" />
                  <CardTitle className="text-lg text-white">Centralized records</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-neutral-400">
                  <p>Keep project reports in one secure place and retrieve them when needed.</p>
                </CardContent>
              </Card>

              <Card className="border-white/12 bg-black/30 shadow-none backdrop-blur">
                <CardHeader className="space-y-3">
                  <LockKeyhole className="h-5 w-5 text-white" />
                  <CardTitle className="text-lg text-white">Controlled access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-neutral-400">
                  <p>Sign in to review reports, recover deleted items, and keep the workspace under control.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <div className="relative flex items-center justify-center bg-background px-6 py-12 sm:px-10 lg:px-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_34%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%)]" />
          <div className="relative flex w-full items-center justify-center">
            <LoginForm />
          </div>
        </div>
      </div> 
    </main>
  );
}
