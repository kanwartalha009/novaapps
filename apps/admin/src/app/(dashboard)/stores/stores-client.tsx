"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminStoreView } from "@/lib/api";
import { PageHeader, Table, Td, Mono } from "@/components/ui";

/** Admin stores table + agency filter, fed by the API (Commit 6). */
export function StoresClient({ stores }: { stores: AdminStoreView[] }) {
  const [agencyFilter, setAgencyFilter] = useState("all");

  const agencies = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s) => m.set(s.agency.slug, s.agency.name));
    return [...m.entries()].map(([slug, name]) => ({ slug, name }));
  }, [stores]);

  const rows = useMemo(
    () => stores.filter((s) => (agencyFilter === "all" ? true : s.agency.slug === agencyFilter)),
    [stores, agencyFilter],
  );

  return (
    <div>
      <PageHeader
        title="Stores"
        desc="Shopify stores connected by partner agencies."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={agencyFilter}
          onChange={(e) => setAgencyFilter(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs"
        >
          <option value="all">All agencies</option>
          {agencies.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name}</option>
          ))}
        </select>
        <span className="text-2xs text-zinc-400">{rows.length} store{rows.length === 1 ? "" : "s"}</span>
      </div>

      <Table head={["Shop domain", "Name", "Agency", "Connected"]}>
        {rows.map((s) => (
          <tr key={s.id} className="hover:bg-zinc-100">
            <Td><Mono>{s.shopDomain}</Mono></Td>
            <Td className="font-medium">{s.name ?? "—"}</Td>
            <Td>
              <Link href={`/agencies/${s.agency.slug}`} className="text-zinc-600 hover:underline">
                {s.agency.slug}
              </Link>
            </Td>
            <Td className="text-xs text-zinc-500">{new Date(s.createdAt).toLocaleDateString()}</Td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><Td className="text-zinc-400">No stores match the filter</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>
    </div>
  );
}
