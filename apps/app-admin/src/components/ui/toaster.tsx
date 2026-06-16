"use client";

import { Toaster as Sonner } from "sonner";

/** sonner toaster, Helm-styled: bordered, flat, 13px. Use `toast.success("…")` anywhere. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      gap={8}
      toastOptions={{
        style: {
          border: "1px solid #E4E4E7",
          boxShadow: "none",
          borderRadius: 8,
          fontSize: 13,
          padding: "10px 14px",
          color: "#1C1917",
        },
      }}
    />
  );
}
