"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function AnimatedSection({
  className,
  children,
  dataTour,
}: Readonly<{
  className?: string;
  children: ReactNode;
  dataTour?: string;
}>) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(className)}
      data-tour={dataTour}
    >
      {children}
    </motion.section>
  );
}
