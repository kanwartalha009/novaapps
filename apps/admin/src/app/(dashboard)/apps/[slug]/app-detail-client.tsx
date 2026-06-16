"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney } from "@nova/shared";
import type { AppAdminView, AgencyLite, AvailabilityView } from "@/lib/api";
import { publishApp } from "@/lib/actions";
import { Badge, Card, Table, Td } from "@/components/ui";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { AppAvailability } from "./app-availability";

const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? "nova-platform.localhost:3003";
const TABS = ["Agencies", "Details & settings"] as const;

export function AppDetailClient({
  app,
  agencies,
  availability,
}: {
  app: AppAdminView;
  agencies: AgencyLite[];
  availability: AvailabilityView | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Agencies");
  const [pending, startTransition] = useTransition();

  function publish() {
    startTransition(async () => {
      const res = await publishApp(app.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${app.name} published`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl">
      <Breadcrumbs items={[{ label: "Apps", href: "/apps" }, { label: app.name }]} />
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight">{app.name}</h1>
          <p className="mt-1 text-body text-zinc-500">{app.description ?? ""}</p>
          <div className="mt-2 flex gap-2"><Badge value={app.status} /><Badge value={app.pricingModel} /></div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`http://${app.slug}.${APP_HOST}`}
            className="rounded-md border border-zinc-300 px-3.5 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            Open app dashboard ↗
          </a>
          {app.status === "DRAFT" && (
            <button
              onClick={publish}
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {pending ? "Publishing…" : "Publish to catalog"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative -mb-px border-b-2 px-3.5 py-2 text-body font-medium transition-colors ${
              tab === t ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto self-center text-2xs text-zinc-400">
          Performance · Webhooks · Support — arrive with later phases
        </span>
      </div>

      {tab === "Agencies" && (
        <div className="mt-6 max-w-3xl">
          <AppAvailability appId={app.id} agencies={agencies} initial={availability} />
        </div>
      )}

      {tab === "Details & settings" && (
        <div className="mt-6 space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">Credentials</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
              <li>Shopify API secret: {app.hasApiSecret ? <span className="font-semibold text-success-600">set</span> : <span className="text-zinc-400">not set</span>}</li>
              <li>Webhook secret: {app.hasWebhookSecret ? <span className="font-semibold text-success-600">set</span> : <span className="text-zinc-400">not set</span>}</li>
              <li>Listing: {app.listingUrl ? <a href={app.listingUrl} target="_blank" className="text-brand-600 hover:underline">App Store ↗</a> : <span className="text-zinc-400">not listed</span>}</li>
            </ul>
            <p className="mt-3 text-2xs text-zinc-400">Editing credentials + engine settings (repo, scopes, DB) arrives with the App Shell engine (Phase E).</p>
          </Card>

          <div>
            <h2 className="mb-3 font-semibold">Pricing plans</h2>
            <Table head={["Plan", "Price", "Interval", "Trial"]}>
              {app.plans.map((p) => (
                <tr key={p.id}>
                  <Td className="font-medium">{p.name}</Td>
                  <Td>{p.amount === 0 ? "Free" : formatMoney(p.amount, p.currency)}</Td>
                  <Td className="text-xs text-zinc-500">{p.interval.replace(/_/g, " ").toLowerCase()}</Td>
                  <Td>{p.trialDays > 0 ? `${p.trialDays} days` : "—"}</Td>
                </tr>
              ))}
              {app.plans.length === 0 && (
                <tr><Td className="text-zinc-400">No plans</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
              )}
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
