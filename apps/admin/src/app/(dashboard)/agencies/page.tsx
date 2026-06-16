"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Building2, Copy, BadgeCheck } from "lucide-react";
import { FX_AGENCIES, FX_SETTINGS, formatRate } from "@nova/shared";
import { PageHeader, Badge, Table, Td } from "@/components/ui";
import { PrimaryButton } from "@/components/overlay";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CreateAgencyDrawer } from "./create-agency-drawer";

export default function AgenciesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Agencies"
        desc="Partner agencies — approve applications, assign apps, set commission rates."
        action={
          <PrimaryButton onClick={() => setCreateOpen(true)} className="px-3.5">
            <Plus size={14} strokeWidth={2} className="mr-1.5 inline-block align-[-2px]" />
            Create agency
          </PrimaryButton>
        }
      />
      <Table head={["Agency", "Subdomain", "Status", "Commission rate", "Members", "Joined", ""]}>
        {FX_AGENCIES.map((a) => (
          <tr key={a.slug} className="hover:bg-zinc-100">
            <Td>
              <Link href={`/agencies/${a.slug}`} className="font-medium text-brand-600 hover:text-brand-700">
                {a.name}
              </Link>
              {a.status === "PENDING_APPROVAL" && (
                <p className="text-2xs font-semibold text-warning-600">Needs review</p>
              )}
            </Td>
            <Td className="text-xs text-zinc-500">{a.slug}.nova-apps.com</Td>
            <Td><Badge value={a.status} /></Td>
            <Td className="num">
              {a.commissionRateBps ? formatRate(a.commissionRateBps) : (
                <span className="text-zinc-400">default ({formatRate(FX_SETTINGS.defaultCommissionRateBps)})</span>
              )}
            </Td>
            <Td className="num">{a.members.length}</Td>
            <Td className="num text-xs text-zinc-500">{a.createdAt}</Td>
            <Td className="w-10 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Actions for ${a.name}`}
                  className="rounded-md p-1.5 text-zinc-400 outline-none transition-colors duration-150 hover:bg-zinc-200 hover:text-zinc-700 data-[state=open]:bg-zinc-200 data-[state=open]:text-zinc-700"
                >
                  <MoreHorizontal size={16} strokeWidth={1.5} />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>{a.name}</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => router.push(`/agencies/${a.slug}`)}>
                    <Building2 size={14} strokeWidth={1.5} className="text-zinc-400" /> Open agency
                  </DropdownMenuItem>
                  {a.status === "PENDING_APPROVAL" && (
                    <DropdownMenuItem onSelect={() => router.push(`/agencies/${a.slug}`)} className="text-warning-600 data-[highlighted]:text-warning-600">
                      <BadgeCheck size={14} strokeWidth={1.5} /> Review application
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      navigator.clipboard.writeText(`${a.slug}.nova-apps.com`);
                      toast.success(`Copied "${a.slug}.nova-apps.com"`);
                    }}
                  >
                    <Copy size={14} strokeWidth={1.5} className="text-zinc-400" /> Copy subdomain
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Td>
          </tr>
        ))}
      </Table>

      <CreateAgencyDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
