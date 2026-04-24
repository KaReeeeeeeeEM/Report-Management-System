"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatusDatum = {
  status: string;
  count: number;
};

const COLORS = ["#f5f5f5", "#cfcfcf", "#8f8f8f", "#575757"];

export function StatusDistributionChart({ data }: { data: StatusDatum[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Reports by Activity</CardTitle>
        </CardHeader>
        <CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="status"
                axisLine={false}
                tickLine={false}
                width={80}
                tick={{ fill: "currentColor", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(127,127,127,0.12)" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
              />
              <Bar dataKey="count" radius={[999, 999, 999, 999]}>
                {data.map((entry, index) => (
                  <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
