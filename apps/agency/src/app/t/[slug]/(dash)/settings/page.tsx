"use client";

import { useState } from "react";
import { formatRate } from "@nova/shared";
import { PageHeader, Card, Mono } from "@/components/ui";

/** Demo form — wires to PATCH /v1/agencies/me (Phase 1 completion). */
export default function SettingsPage() {
  const [name, setName] = useState("Acme Digital");
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" desc="Agency profile." />
      <Card className="p-5">
        <form
          onSubmit={(e) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium">Agency name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Subdomain</label>
            <p className="mt-1 text-sm"><Mono>acme.nova-apps.com</Mono></p>
            <p className="mt-1 text-xs text-zinc-400">Subdomains are permanent after approval. Contact support to migrate.</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Commission rate</label>
            <p className="mt-1 text-sm font-semibold">{formatRate(2500)}</p>
            <p className="mt-1 text-xs text-zinc-400">Set by the platform team. Snapshotted on each commission when earned.</p>
          </div>
          <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {saved ? "✓ Saved (demo)" : "Save"}
          </button>
        </form>
      </Card>
    </div>
  );
}
