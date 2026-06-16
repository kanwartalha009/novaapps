import type { Metadata } from "next";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nova Apps — App Backends",
  description: "Multi-app backend host for Nova Shopify apps.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
