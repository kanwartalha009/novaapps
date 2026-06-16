"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { Avatar } from "@/components/ui";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * Account menu (settings, sign out).
 * variant="avatar": topbar — avatar-only trigger (GrowthOS).
 * variant="block": sidebar footer block with name/email.
 */
export function UserMenu({
  name, email, settingsHref = "/settings", variant = "block",
}: {
  name: string; email: string; settingsHref?: string; variant?: "block" | "avatar";
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      {variant === "avatar" ? (
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="rounded-full outline-none transition-opacity duration-150 hover:opacity-85 data-[state=open]:opacity-85"
        >
          <Avatar name={name} />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-[7px] border border-zinc-200 px-2.5 py-2 text-left outline-none transition-colors duration-150 hover:bg-zinc-50 data-[state=open]:bg-zinc-50">
          <Avatar name={name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-900">{name}</p>
            <p className="truncate text-2xs text-zinc-400">{email}</p>
          </div>
          <ChevronsUpDown size={14} strokeWidth={1.5} className="shrink-0 text-zinc-400" />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        side={variant === "avatar" ? "bottom" : "top"}
        align={variant === "avatar" ? "end" : "start"}
        className="w-[220px]"
      >
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block text-xs font-medium text-zinc-900">{name}</span>
          <span className="block truncate text-2xs font-normal text-zinc-400">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(settingsHref)}>
          <Settings size={14} strokeWidth={1.5} className="text-zinc-400" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="text-danger-600 data-[highlighted]:bg-danger-50 data-[highlighted]:text-danger-600">
          <LogOut size={14} strokeWidth={1.5} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
