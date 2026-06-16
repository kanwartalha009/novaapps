"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@nova/shared";
import type { CatalogAppView, StoreView } from "@/lib/api";
import { PageHeader, Badge, Card } from "@/components/ui";
import { SlideOver, Field, Select, PrimaryButton, GhostButton } from "@/components/overlay";

/**
 * Catalog (availability-filtered server-side). Install handoff to Shopify OAuth is a later phase;
 * the button records a local "started" state for now. Commission/earnings preview returns with P2.
 */
export function CatalogClient({ apps, stores }: { apps: CatalogAppView[]; stores: StoreView[] }) {
  const [installingApp, setInstallingApp] = useState<string | null>(null);
  const [storeChoice, setStoreChoice] = useState(stores[0]?.shopDomain ?? "");
  const [started, setStarted] = useState<string[]>([]);

  const app = apps.find((a) => a.slug === installingApp);

  function confirmInstall() {
    if (installingApp) setStarted((x) => [...x, installingApp]);
    setInstallingApp(null);
  }

  return (
    <div>
      <PageHeader
        title="App catalog"
        desc="Apps available to your agency. Install on client stores and earn commission on every subscription payment."
      />
      {apps.length === 0 && (
        <Card className="p-5 text-center text-sm text-zinc-400">
          No apps available to your agency yet — contact the Nova team.
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {apps.map((a) => (
          <Card key={a.slug} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/apps/${a.slug}`} className="font-semibold text-brand-600 hover:underline">{a.name}</Link>
                <p className="mt-1 text-sm text-zinc-600">{a.description ?? ""}</p>
              </div>
              <Badge value={a.pricingModel} />
            </div>

            <div className="mt-4 space-y-1">
              {a.plans.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">
                    {p.name}
                    {p.trialDays > 0 && <span className="text-xs text-zinc-400"> · {p.trialDays}-day trial</span>}
                  </span>
                  <span className="font-medium">
                    {p.amount === 0 ? "Free" : `${formatMoney(p.amount, p.currency)}/${p.interval === "ANNUAL" ? "yr" : "mo"}`}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-zinc-100 pt-4">
              {started.includes(a.slug) ? (
                <span className="text-sm font-semibold text-success-600">
                  ✓ Install started (demo) — the merchant approves the charge on Shopify
                </span>
              ) : (
                <PrimaryButton onClick={() => setInstallingApp(a.slug)} disabled={stores.length === 0}>
                  {stores.length === 0 ? "Connect a store first" : "Install on a store"}
                </PrimaryButton>
              )}
            </div>
          </Card>
        ))}
      </div>

      <SlideOver
        open={!!installingApp}
        onClose={() => setInstallingApp(null)}
        title={`Install ${app?.name ?? ""}`}
        desc="Attribution locks to your agency for the lifetime of this install."
        footer={
          <>
            <GhostButton onClick={() => setInstallingApp(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={confirmInstall} disabled={!storeChoice}>Continue to Shopify →</PrimaryButton>
          </>
        }
      >
        <Field label="Install on store" hint="The merchant completes OAuth and approves any charge on Shopify.">
          <Select value={storeChoice} onChange={(e) => setStoreChoice(e.target.value)}>
            {stores.map((s) => <option key={s.id} value={s.shopDomain}>{s.shopDomain}</option>)}
          </Select>
        </Field>
      </SlideOver>
    </div>
  );
}
