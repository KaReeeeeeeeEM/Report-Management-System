"use client";

import { motion } from "framer-motion";

import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

type DashboardHeaderProps = {
  adminName: string;
};

export function DashboardHeader({ adminName }: DashboardHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-semibold">{adminName}</h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </motion.header>
  );
}
