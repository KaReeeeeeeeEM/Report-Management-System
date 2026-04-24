"use client";

import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrendDatum = {
  month: string;
  reports: number;
};

export function ReportsTrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Monthly Report Growth</CardTitle>
        </CardHeader>
        <CardContent className="h-[340px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="reportTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(127,127,127,0.25)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "currentColor", fontSize: 12 }} />
              <Tooltip
                cursor={{ stroke: "rgba(127,127,127,0.25)" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="reports"
                stroke="currentColor"
                fill="url(#reportTrend)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
