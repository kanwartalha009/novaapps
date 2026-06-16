import type { ReactNode } from "react";
import { getHostedApp, MODULE_FEATURES } from "@/lib/apps-registry";
import { NavLinks, type NavSection } from "@/components/nav-links";
import { Badge } from "@/components/ui";
import { CommandMenu, type CommandGroupDef } from "@/components/ui/command-menu";
import { Toaster } from "@/components/ui/toaster";

/**
 * Per-app admin panel shell — [app-slug].nova-platform.localhost:3003.
 * GrowthOS-pattern: 248px sidebar + sticky 56px topbar.
 * Phase 2: protected by platform admin auth (shared JWT, apps:read).
 */
export default async function AppPanelLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ appSlug: string }>;
}) {
  const { appSlug } = await params;
  // Always resolves — freshly created slugs synthesize a just-scaffolded DRAFT app.
  const { app, modules, db } = getHostedApp(appSlug);

  const features = modules
    .filter((m) => m !== "backend" && MODULE_FEATURES[m])
    .map((m) => ({ key: m, ...MODULE_FEATURES[m] }));

  const sections: NavSection[] = [
    {
      heading: "App",
      items: [
        { label: "Overview", href: "/", icon: "overview" },
        { label: "App Home preview", href: "/embed", icon: "embed" },
      ],
    },
    {
      heading: "Build",
      items: [
        { label: "Screen specs", href: "/specs", icon: "specs" },
        { label: "Backend", href: "/backend", icon: "backend" },
        { label: "Build pack", href: "/export", icon: "export" },
      ],
    },
    ...(features.length > 0
      ? [{
          heading: "Features",
          items: features.map((f) => ({
            label: f.label,
            href: `/features/${f.key}`,
            icon: (f.key === "pixel" ? "analytics" : "feature") as "analytics" | "feature",
          })),
        }]
      : []),
  ];

  const commandGroups: CommandGroupDef[] = [
    ...sections.map((s) => ({
      heading: s.heading,
      items: s.items.map((i) => ({ label: i.label, href: i.href })),
    })),
    {
      heading: "Platform",
      items: [{ label: "Open in platform admin", href: `http://admin.nova-apps.localhost:3001/apps/${app.slug}`, hint: "↗" }],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <span className="block truncate text-sm font-semibold tracking-tight">{app.name}</span>
          <span className="text-2xs text-zinc-400">App admin · {app.slug}</span>
        </div>
        <NavLinks sections={sections} />
        <div className="border-t border-zinc-200 p-3">
          <div className="rounded-[10px] border border-zinc-200 px-2.5 py-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">Database</span>
              <Badge value={db.status === "CONNECTED" ? "ACTIVE" : db.status === "MIGRATIONS_PENDING" ? "PENDING" : "DRAFT"} />
            </div>
            <a
              href={`http://admin.nova-apps.localhost:3001/apps/${app.slug}`}
              className="mt-1.5 block truncate text-xs font-medium text-zinc-600 transition-colors duration-150 hover:text-zinc-900 hover:underline"
            >
              Open in platform admin →
            </a>
          </div>
        </div>
      </aside>

      <div className="ml-[248px] flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/85 px-6 backdrop-blur">
          <span className="flex items-center gap-2 text-body text-zinc-500">
            <span className="font-medium text-zinc-900">{app.name}</span>
            <Badge value={app.status} />
          </span>
          <div className="flex-1" />
          <CommandMenu groups={commandGroups} placeholder="Search this app's panel…" />
          <a
            href={`http://admin.nova-apps.localhost:3001/apps/${app.slug}`}
            className="btn btn-secondary btn-sm"
          >
            Platform settings ↗
          </a>
        </header>
        <main className="flex-1 px-8 pb-16 pt-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
