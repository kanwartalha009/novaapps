import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { FX_AGENCY_APPS, FX_APPS } from "@nova/shared";
import { getTenantMe } from "@/lib/api";
import { NavLinks, type NavSection } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { CommandMenu, type CommandGroupDef } from "@/components/ui/command-menu";
import { Toaster } from "@/components/ui/toaster";

const SECTIONS: NavSection[] = [
  {
    heading: "Operate",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard" },
      { label: "Stores", href: "/stores", icon: "stores" },
      { label: "Installations", href: "/installations", icon: "installations" },
      { label: "Support", href: "/support", icon: "support" },
    ],
  },
  {
    heading: "Earn",
    items: [
      { label: "App catalog", href: "/apps", icon: "apps" },
      { label: "Commissions", href: "/commissions", icon: "commissions" },
      { label: "Payouts", href: "/payouts", icon: "payouts" },
    ],
  },
  {
    heading: "Tools",
    items: [
      { label: "Tools", href: "/tools", icon: "tools" },
      { label: "Subscriptions", href: "/subscriptions", icon: "subscriptions" },
    ],
  },
  {
    heading: "Manage",
    items: [
      { label: "Team", href: "/team", icon: "team" },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

/** GrowthOS-pattern shell: 248px sidebar + sticky 56px topbar (search, account). */
export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const me = await getTenantMe(slug);
  if (!me) redirect("/login");

  // ⌘K palette: pages + this agency's assigned apps (tenant-relative hrefs).
  const assignedApps = FX_AGENCY_APPS.filter((x) => x.agencySlug === slug)
    .map((x) => FX_APPS.find((a) => a.slug === x.appSlug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const commandGroups: CommandGroupDef[] = [
    { heading: "Pages", items: SECTIONS.flatMap((s) => s.items.map((i) => ({ label: i.label, href: i.href }))) },
    { heading: "Your apps", items: assignedApps.map((a) => ({ label: a.name, href: `/apps/${a.slug}`, hint: a.slug })) },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <span className="block truncate text-sm font-semibold capitalize tracking-tight">{me.agency?.name}</span>
          <span className="text-2xs text-zinc-400">Nova Apps · Agency</span>
        </div>
        <NavLinks sections={SECTIONS} />
      </aside>

      <div className="ml-[248px] flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/85 px-6 backdrop-blur">
          <span className="text-body capitalize text-zinc-500">
            {me.agency?.name} <span className="text-zinc-300">/</span>{" "}
            <span className="font-medium normal-case text-zinc-900">Dashboard</span>
          </span>
          <div className="flex-1" />
          <CommandMenu groups={commandGroups} placeholder="Search pages, your apps…" />
          <UserMenu name={me.name} email={me.email} settingsHref="/settings" variant="avatar" />
        </header>
        <main className="flex-1 px-8 pb-16 pt-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
