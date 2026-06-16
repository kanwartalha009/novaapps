import type { Metadata } from "next";
import "./globals.css";
import type { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: { default: "Nova Apps — Shopify apps, distributed by agencies", template: "%s · Nova Apps" },
  description:
    "A curated suite of Shopify apps with a built-in agency partner program. Install for clients, earn recurring commission.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="flex min-h-screen flex-col text-zinc-900 antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
