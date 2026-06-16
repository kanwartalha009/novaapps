"use client";

import { useMemo, useState } from "react";
import { FX_WEBHOOK_EVENTS, FX_APPS } from "@nova/shared";
import { PageHeader, Badge, Table, Td, Mono } from "@/components/ui";

/**
 * Webhook ingress log — app-scoped like tickets and charges (scale posture, architecture.md).
 * Wires to GET /v1/admin/webhook-events?appId= [billing:read].
 */
export default function WebhookEventsPage() {
  const [appFilter, setAppFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(
    () =>
      FX_WEBHOOK_EVENTS.filter((e) => (appFilter === "all" ? true : e.appSlug === appFilter))
        .filter((e) => (statusFilter === "all" ? true : e.status === statusFilter))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [appFilter, statusFilter],
  );

  return (
    <div>
      <PageHeader
        title="Webhook events"
        desc="Raw Shopify ingress — HMAC-verified, idempotent on X-Shopify-Webhook-Id, keyed by app for easy sorting at 100+ apps."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex w-fit gap-1 rounded-lg bg-zinc-100 p-0.5">
          <button onClick={() => setAppFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${appFilter === "all" ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
            All apps
          </button>
          {FX_APPS.map((a) => {
            const failed = FX_WEBHOOK_EVENTS.filter((e) => e.appSlug === a.slug && e.status === "FAILED").length;
            return (
              <button key={a.slug} onClick={() => setAppFilter(a.slug)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${appFilter === a.slug ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
                {a.name}
                {failed > 0 && <span className="ml-1.5 rounded-full bg-danger-100 px-1.5 text-2xs text-danger-600">{failed}</span>}
              </button>
            );
          })}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs">
          <option value="all">All statuses</option>
          <option value="RECEIVED">Received</option>
          <option value="PROCESSED">Processed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <Table head={["Webhook ID", "App", "Topic", "Shop", "Status", "Error", "Received", ""]}>
        {rows.map((e) => (
          <tr key={e.id} className="hover:bg-zinc-100">
            <Td><Mono>{e.externalId}</Mono></Td>
            <Td className="text-xs font-medium">{FX_APPS.find((a) => a.slug === e.appSlug)?.name ?? e.appSlug}</Td>
            <Td><Mono>{e.topic}</Mono></Td>
            <Td className="text-xs text-zinc-500">{e.shopDomain}</Td>
            <Td><Badge value={e.status} /></Td>
            <Td className="max-w-48 truncate text-xs text-danger-600">{e.error ?? ""}</Td>
            <Td className="text-xs text-zinc-500">{e.createdAt}</Td>
            <Td className="text-right">
              {e.status === "FAILED" && (
                <button className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
                  Retry
                </button>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
