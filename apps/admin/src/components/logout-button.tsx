"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      title="Sign out"
      aria-label="Sign out"
      className="rounded-md p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900"
    >
      <LogOut size={16} strokeWidth={1.5} />
    </button>
  );
}
