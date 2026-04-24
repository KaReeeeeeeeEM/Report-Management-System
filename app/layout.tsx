import type { ReactNode } from "react";
import type { Metadata } from "next";

import { DesktopShareListener } from "@/components/dashboard/desktop-share-listener";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterProvider } from "@/components/toaster-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Report Management System",
  description: "A simple report management system with file storage, charts, and MongoDB-backed metadata.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <DesktopShareListener />
          <ToasterProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
