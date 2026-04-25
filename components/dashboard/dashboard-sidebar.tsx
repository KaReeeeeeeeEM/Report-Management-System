"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Share2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/shared", label: "Shared", icon: Share2 },
  { href: "/recycle-bin", label: "Recycle Bin", icon: Trash2 },
] as const satisfies ReadonlyArray<{ href: Route; label: string; icon: typeof LayoutDashboard }>;

type DashboardSidebarProps = {
  adminName: string;
  adminEmail: string;
};

export function DashboardSidebar({ adminName, adminEmail }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="border-r border-border bg-background px-5 py-6">
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex h-full flex-col">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Image width={400} height={400} className="h-5 w-5" src={"/logo.svg"} alt={"Logo"} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Your space</p>
            <h2 className="text-lg font-semibold">Reports Home</h2>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{adminName}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{adminEmail}</p>
        </div>

        <nav className="mt-8 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </motion.div>
    </aside>
  );
}
