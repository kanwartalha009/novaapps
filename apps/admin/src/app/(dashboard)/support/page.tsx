"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FX_TICKETS, FX_APPS } from "@nova/shared";
import { PageHeader, Badge, Stat, Table, Td, Mono } from "@/components/ui";

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "bg-danger-50 text-danger-600",
  HIGH: "bg-warning-50 text-warning-600",
  NORMAL: "bg-zinc-100 text-zinc-500",
  LOW: "bg-zinc-100 text-zinc-400",
};

/**
 * Support inbox — app-scoped queues (spec: docs/03-modules/support.md).
 * Wires to GET /v1/admin/support/tickets?appId=&status= [support:read].
 */
export default function SupportInboxPage() {
  const [appFilter, setAppFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const rows = useMemo(
    () =>
      FX_TICKETS.filter((t) => (appFilter === "all" ? true : t.appSlug === appFilter))
        .filter((t) => (statusFilter === "all" ? true : statusFilter === "active" ? t.status !== "RESOLVED" : t.status === "RESOLVED"))
        .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1)),
    [appFilter, statusFilter],
  );

  const open = FX_TICKETS.filter((t) => t.status === "OPEN").length;
  const urgent = FX_TICKETS.filter((t) => t.status !== "RESOLVED" && (t.priority === "URGENT" || t.priority === "HIGH")).length;
  const botRate = Math.round((FX_TICKETS.filter((t) => t.botHandled).length / FX_TICKETS.length) * 100);

  return (
    <div>
      <PageHeader
        title="Support"
        desc="App-scoped ticket queues. Basic app questions are resolved by the automatic chat; the team handles escalations."
      />
      <div className="mb-6 grid max-w-3xl grid-cols-3 gap-4">
        <Stat label="Open tickets" value={String(open)} />
        <Stat label="Needs attention" value={String(urgent)} hint="high/urgent, unresolved" />
        <Stat label="Bot-resolved" value={`${botRate}%`} hint="no human touch needed" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5">
          <button onClick={() => setAppFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${appFilter === "all" ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
            All apps
          </button>
          {FX_APPS.map((a) => {
            const count = FX_TICKETS.filter((t) => t.appSlug === a.slug && t.status !== "RESOLVED").length;
            return (
              <button key={a.slug} onClick={() => setAppFilter(a.slug)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${appFilter === a.slug ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
                {a.name}{count > 0 && <span className="ml-1.5 rounded-full bg-zinc-200 px-1.5 text-2xs">{count}</span>}
              </button>
            );
          })}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs">
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <p className="text-2xs text-zinc-400">At 100+ apps these queues paginate per app — same key as webhooks & charges.</p>
      </div>

      <Table head={["Ticket", "App", "Store", "Priority", "Status", "Assignee", "Last activity"]}>
        {rows.map((t) => (
          <tr key={t.id} className="hover:bg-zinc-100">
            <Td>
              <Link href={`/support/${t.id}`} className="font-medium text-brand-600 hover:underline">
                {t.subject}
              </Link>
              <p className="text-2xs text-zinc-400">
                {t.id}{t.botHandled && " · 🤖 bot-resolved"}
              </p>
            </Td>
            <Td className="text-xs font-medium">{FX_APPS.find((a) => a.slug === t.appSlug)?.name}</Td>
            <Td className="text-xs"><Mono>{t.shopDomain}</Mono></Td>
            <Td>
              <span className={`inline-block rounded-md px-1.5 py-0.5 text-2xs font-medium ${PRIORITY_COLOR[t.priority]}`}>
                {t.priority}
              </span>
            </Td>
            <Td><Badge value={t.status} /></Td>
            <Td className="text-xs text-zinc-500">{t.assignee ?? "—"}</Td>
            <Td className="text-xs text-zinc-500">{t.lastActivityAt}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
