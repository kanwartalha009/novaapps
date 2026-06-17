import type { ReactNode } from "react";
import { getTool } from "@/lib/api";
import { NavLinks, type NavSection } from "@/components/nav-links";
import { Badge } from "@/components/ui";
import { Toaster } from "@/components/ui/toaster";

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://admin.nova-apps.localhost:3001";

/** Per-tool builder console — [tool-slug].nova-tools.localhost:3004 (ADR-010). */
export default async function ToolShellLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ toolSlug: string }>;
}) {
  const { toolSlug } = await params;
  const tool = await getTool(toolSlug);
  const name = tool?.name ?? toolSlug;

  const buildItems: NavSection["items"] = [
    { label: "Blueprint", href: "/specs", icon: "specs" },
    ...(tool?.usesStoreBridge ? ([{ label: "Store Bridge", href: "/bridge", icon: "bridge" }] as NavSection["items"]) : []),
    { label: "Plans", href: "/plans", icon: "plans" },
    { label: "Build pack", href: "/export", icon: "export" },
    { label: "Release", href: "/release", icon: "release" },
  ];
  const sections: NavSection[] = [
    { heading: "Tool", items: [{ label: "Overview", href: "/", icon: "overview" }] },
    { heading: "Build", items: buildItems },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <span className="block truncate text-sm font-semibold tracking-tight">{name}</span>
          <span className="text-2xs text-zinc-400">Tool Shell · {toolSlug}</span>
        </div>
        <NavLinks sections={sections} />
        <div className="border-t border-zinc-200 p-3">
          <a
            href={`${ADMIN}/tools/${toolSlug}`}
            className="block truncate rounded-[10px] border border-zinc-200 px-2.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:underline"
          >
            Open in platform admin →
          </a>
        </div>
      </aside>

      <div className="ml-[248px] flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/85 px-6 backdrop-blur">
          <span className="flex items-center gap-2 text-body text-zinc-500">
            <span className="font-medium text-zinc-900">{name}</span>
            {tool && <Badge value={tool.status} />}
            {tool && <Badge value={tool.toolType} />}
          </span>
          <div className="flex-1" />
          <a href={`${ADMIN}/tools/${toolSlug}`} className="btn btn-secondary btn-sm">Platform settings ↗</a>
        </header>
        <main className="flex-1 px-8 pb-16 pt-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
