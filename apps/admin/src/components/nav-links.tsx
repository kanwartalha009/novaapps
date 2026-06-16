"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, LifeBuoy, PackageCheck, Store, Webhook, Boxes, Building2,
  Receipt, Percent, Banknote, Users, ShieldCheck, Settings, Wrench, type LucideIcon,
} from "lucide-react";

/** Icon registry lives client-side — server layouts pass serializable string keys. */
const ICONS = {
  dashboard: LayoutDashboard,
  support: LifeBuoy,
  installations: PackageCheck,
  stores: Store,
  webhooks: Webhook,
  apps: Boxes,
  tools: Wrench,
  agencies: Building2,
  charges: Receipt,
  commissions: Percent,
  payouts: Banknote,
  users: Users,
  roles: ShieldCheck,
  settings: Settings,
  team: Users,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;

export interface NavSection {
  heading: string;
  items: { label: string; href: string; icon?: NavIcon }[];
}

/**
 * Sidebar nav — 13px medium, 32px rows, 16px icons, active = zinc-900 on zinc-100
 * fill (no left accent bar). Works under tenant rewrites too.
 */
export function NavLinks({ sections }: { sections: NavSection[] }) {
  const raw = usePathname() ?? "/";
  const path = raw.replace(/^\/t\/[^/]+/, "") || "/";

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-3">
      {sections.map((sec) => (
        <div key={sec.heading}>
          <p className="px-2.5 pb-1.5 pt-6 text-2xs font-semibold uppercase tracking-widest text-zinc-400">
            {sec.heading}
          </p>
          <div className="space-y-0.5">
            {sec.items.map((item) => {
              const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/");
              const Icon = item.icon ? ICONS[item.icon] : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex h-8 items-center gap-2.5 rounded-[7px] px-2.5 text-body font-medium transition-colors duration-150 ${
                    active
                      ? "bg-zinc-100 text-zinc-900 before:absolute before:-left-px before:bottom-1.5 before:top-1.5 before:w-0.5 before:rounded-full before:bg-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-900"
                  }`}
                >
                  {Icon && <Icon size={16} strokeWidth={1.5} className={active ? "text-zinc-900" : "text-zinc-400"} />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
