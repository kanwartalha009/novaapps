import type { Metadata } from "next";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nova Apps Admin",
  description: "Nova Apps Platform — Nova Apps Admin",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
