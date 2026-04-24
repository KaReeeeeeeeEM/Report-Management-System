"use client";

import { motion } from "framer-motion";
import { BarChart3, FileSpreadsheet, Files, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const icons = {
  reports: Files,
  storage: FileSpreadsheet,
  reviewed: BarChart3,
  trending: TrendingUp,
} as const;

type MetricCardProps = {
  title: string;
  value: string | number;
  helper: string;
  iconName: keyof typeof icons;
};

export function MetricCard({ title, value, helper, iconName }: MetricCardProps) {
  const Icon = icons[iconName];

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className="rounded-full bg-muted p-2">
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{helper}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
