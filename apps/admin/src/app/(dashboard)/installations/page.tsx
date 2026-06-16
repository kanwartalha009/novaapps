"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FX_INSTALLATIONS, FX_APPS, FX_AGENCIES } from "@nova/shared";
import { PageHeader, Badge, Stat, Table, Td, Mono } from "@/components/ui";

function InstallationsView() {
  const params = useSearchParams();
  const [appFilter, setAppFilter] = useState(params.get("app") ?? "all");
  const [agencyFilter, setAgencyFilter] = useState(params.get("agency") ?? "all");
  const [statusFilter, setStatusFilter] = useState(params.get("status") ?? "all");
  const storeFilter = params.get("store"); // deep-linked from Stores page

  const rows = useMemo(
    () =>
      FX_INSTALLATIONS.filter((i) => (storeFilter ? i.shopDomain === storeFilter : true))
        .filter((i) => (appFilter === "all" ? true : i.appSlug === appFilter))
        .filter((i) => (agencyFilter === "all" ? true : i.agencySlug === agencyFilter))
        .filter((i) => (statusFilter === "all" ? true : i.status === statusFilter)),
    [appFilter, agencyFilter, statusFilter, storeFilter],
  );

  return (
    <div>
      <PageHeader
        title="Installations"
        desc="App ⨯ store installs across all agencies. Subscription status mirrors Shopify's charge lifecycle."
      />

      <div className="mb-4 grid max-w-2xl grid-cols-3 gap-4">
        <Stat label="Active" value={String(FX_INSTALLATIONS.filter((i) => i.status === "ACTIVE").length)} />
        <Stat label="Pending merchant approval" value={String(FX_INSTALLATIONS.filter((i) => i.status === "PENDING").length)} />
        <Stat label="Frozen subscriptions" value={String(FX_INSTALLATIONS.filter((i) => i.subscriptionStatus === "frozen").length)} hint="shop non-payment" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex w-fit gap-1 rounded-lg bg-zinc-100 p-0.5">
          <button onClick={() => setAppFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${appFilter === "all" ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
            All apps
          </button>
          {FX_APPS.map((a) => (
            <button key={a.slug} onClick={() => setAppFilter(a.slug)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${appFilter === a.slug ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
              {a.name}
            </button>
          ))}
        </div>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs">
          <option value="all">All agencies</option>
          {FX_AGENCIES.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs">
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="UNINSTALLED">Uninstalled</option>
        </select>
        {storeFilter && (
          <span className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white">
            store: {storeFilter}
            <Link href="/installations" className="text-zinc-400 hover:text-white">✕</Link>
          </span>
        )}
        <span className="text-2xs text-zinc-400">{rows.length} result{rows.length === 1 ? "" : "s"}</span>
      </div>

      <Table head={["App", "Store", "Agency", "Plan", "Install status", "Shopify subscription", "Installed"]}>
        {rows.map((i) => (
          <tr key={i.id} className="hover:bg-zinc-100">
            <Td>
              <Link href={`/apps/${i.appSlug}`} className="font-medium text-brand-600 hover:underline">
                {FX_APPS.find((a) => a.slug === i.appSlug)?.name}
              </Link>
            </Td>
            <Td>
              <Link href={`/installations?store=${i.shopDomain}`} className="hover:underline">
                <Mono>{i.shopDomain}</Mono>
              </Link>
            </Td>
            <Td>
              <Link href={`/agencies/${i.agencySlug}`} className="text-zinc-600 hover:underline">{i.agencySlug}</Link>
            </Td>
            <Td>{i.planName ?? "—"}</Td>
            <Td><Badge value={i.status} /></Td>
            <Td>{i.subscriptionStatus ? <Badge value={i.subscriptionStatus} /> : <span className="text-xs text-zinc-400">free plan</span>}</Td>
            <Td className="text-xs text-zinc-500">{i.installedAt ?? "—"}</Td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><Td className="text-zinc-400">No installations match the filters</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>
    </div>
  );
}

export default function InstallationsPage() {
  return (
    <Suspense>
      <InstallationsView />
    </Suspense>
  );
}
