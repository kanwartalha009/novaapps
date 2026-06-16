import type { Metadata } from "next";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nova Tools — Tool Shell",
  description: "Per-tool builder console for Nova tools.",
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
