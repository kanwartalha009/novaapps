"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, ExternalLink, Settings2, Copy, PackageOpen } from "lucide-react";
import { formatMoney } from "@nova/shared";
import type { AppAdminView } from "@/lib/api";
import { PageHeader, Badge, Table, Td } from "@/components/ui";
import { PrimaryButton } from "@/components/overlay";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CreateAppDrawer } from "./create-app-drawer";

const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? "nova-platform.localhost:3003";

export function AppsClient({ apps }: { apps: AppAdminView[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Apps"
        desc="Registry of platform apps published to the Shopify App Store."
        action={
          <PrimaryButton onClick={() => setCreateOpen(true)} className="px-3.5">
            <Plus size={14} strokeWidth={2} className="mr-1.5 inline-block align-[-2px]" />
            Create app
          </PrimaryButton>
        }
      />
      <Table head={["App", "Status", "Pricing", "Plans", "Backend", "Listing", ""]}>
        {apps.map((app) => (
          <tr key={app.slug} className="hover:bg-zinc-100">
            <Td>
              <Link href={`/apps/${app.slug}`} className="font-medium text-brand-600 hover:text-brand-700">
                {app.name}
              </Link>
              <p className="text-xs text-zinc-400">{app.description ?? ""}</p>
            </Td>
            <Td><Badge value={app.status} /></Td>
            <Td><Badge value={app.pricingModel} /></Td>
            <Td>
              {app.plans.length === 0 ? (
                <span className="text-xs text-zinc-400">—</span>
              ) : (
                app.plans.map((p) => (
                  <span key={p.name} className="num mr-2 text-xs text-zinc-500">
                    {p.name} {p.amount > 0 ? formatMoney(p.amount, p.currency) : "free"}
                  </span>
                ))
              )}
            </Td>
            <Td className="text-xs">
              <a
                href={`http://${app.slug}.${APP_HOST}`}
                target="_blank"
                className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-2xs font-medium text-zinc-600 hover:bg-zinc-200"
              >
                {app.slug}.nova-platform ↗
              </a>
            </Td>
            <Td className="text-xs">
              {app.listingUrl ? (
                <a href={app.listingUrl} className="text-brand-600 hover:underline" target="_blank">
                  App Store ↗
                </a>
              ) : (
                <span className="text-zinc-400">not listed</span>
              )}
            </Td>
            <Td className="w-10 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Actions for ${app.name}`}
                  className="rounded-md p-1.5 text-zinc-400 outline-none transition-colors duration-150 hover:bg-zinc-200 hover:text-zinc-700 data-[state=open]:bg-zinc-200 data-[state=open]:text-zinc-700"
                >
                  <MoreHorizontal size={16} strokeWidth={1.5} />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>{app.name}</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => router.push(`/apps/${app.slug}`)}>
                    <Settings2 size={14} strokeWidth={1.5} className="text-zinc-400" /> Control center
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => window.open(`http://${app.slug}.${APP_HOST}`, "_blank")}>
                    <ExternalLink size={14} strokeWidth={1.5} className="text-zinc-400" /> App dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => window.open(`http://${app.slug}.${APP_HOST}/export`, "_blank")}>
                    <PackageOpen size={14} strokeWidth={1.5} className="text-zinc-400" /> Build pack
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      navigator.clipboard.writeText(app.slug);
                      toast.success(`Copied slug "${app.slug}"`);
                    }}
                  >
                    <Copy size={14} strokeWidth={1.5} className="text-zinc-400" /> Copy slug
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Td>
          </tr>
        ))}
        {apps.length === 0 && (
          <tr>
            <Td className="text-zinc-400">No apps yet — create your first one.</Td>
            <Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td>
          </tr>
        )}
      </Table>

      <CreateAppDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
