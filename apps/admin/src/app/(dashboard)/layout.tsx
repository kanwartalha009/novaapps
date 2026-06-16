import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { FX_APPS, FX_AGENCIES } from "@nova/shared";
import { getMe } from "@/lib/api";
import { NavLinks, type NavSection } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { CommandMenu, type CommandGroupDef } from "@/components/ui/command-menu";
import { Toaster } from "@/components/ui/toaster";

/** Icons are string keys — resolved client-side in NavLinks (RSC serialization). */
const SECTIONS: NavSection[] = [
  {
    heading: "Operate",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { label: "Support", href: "/support", icon: "support" },
      { label: "Installations", href: "/installations", icon: "installations" },
      { label: "Stores", href: "/stores", icon: "stores" },
      { label: "Webhook events", href: "/webhook-events", icon: "webhooks" },
    ],
  },
  {
    heading: "Manage",
    items: [
      { label: "Apps", href: "/apps", icon: "apps" },
      { label: "Tools", href: "/tools", icon: "tools" },
      { label: "Agencies", href: "/agencies", icon: "agencies" },
      { label: "Charges", href: "/charges", icon: "charges" },
      { label: "Commissions", href: "/commissions", icon: "commissions" },
      { label: "Payouts", href: "/payouts", icon: "payouts" },
      { label: "Users", href: "/users", icon: "users" },
      { label: "Roles", href: "/roles", icon: "roles" },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

/** ⌘K palette groups — pages + every app and agency (serializable, built server-side). */
const COMMAND_GROUPS: CommandGroupDef[] = [
  { heading: "Pages", items: SECTIONS.flatMap((s) => s.items.map((i) => ({ label: i.label, href: i.href }))) },
  { heading: "Apps", items: FX_APPS.map((a) => ({ label: a.name, href: `/apps/${a.slug}`, hint: a.slug })) },
  { heading: "Agencies", items: FX_AGENCIES.map((a) => ({ label: a.name, href: `/agencies/${a.slug}`, hint: a.slug })) },
];

/** GrowthOS-pattern shell: 248px sidebar + sticky 56px topbar (search, account). */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <span className="text-sm font-semibold tracking-tight">
            Nova<span className="text-zinc-400">Apps</span>
          </span>
          <span className="block text-2xs text-zinc-400">Platform admin</span>
        </div>
        <NavLinks sections={SECTIONS} />
      </aside>

      <div className="ml-[248px] flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/85 px-6 backdrop-blur">
          <span className="text-body text-zinc-500">
            NovaApps <span className="text-zinc-300">/</span>{" "}
            <span className="font-medium text-zinc-900">Platform admin</span>
          </span>
          <div className="flex-1" />
          <CommandMenu groups={COMMAND_GROUPS} />
          <UserMenu name={me.name} email={me.email} settingsHref="/settings" variant="avatar" />
        </header>
        <main className="flex-1 px-8 pb-16 pt-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
