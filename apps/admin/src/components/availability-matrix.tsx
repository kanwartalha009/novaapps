"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AgencyLite, AvailabilityView } from "@/lib/api";
import { setAvailability } from "@/lib/actions";
import { Card, Badge } from "@/components/ui";
import { PrimaryButton } from "@/components/overlay";

/**
 * Reusable availability editor for Apps OR Tools (ADR-011). PRIVATE = allowlist; PUBLIC = all
 * except excluded. Computes ALLOW/DENY entries on save → `setAvailability(productType, …)`.
 */
export function AvailabilityMatrix({
  productType,
  productId,
  agencies,
  initial,
}: {
  productType: "APP" | "TOOL";
  productId: string;
  agencies: AgencyLite[];
  initial: AvailabilityView | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"PRIVATE" | "PUBLIC">(initial?.mode ?? "PRIVATE");

  const initialAvailable = useMemo(() => {
    const entries = initial?.entries ?? [];
    const denied = new Set(entries.filter((e) => e.effect === "DENY").map((e) => e.agencyId));
    const allowed = new Set(entries.filter((e) => e.effect === "ALLOW").map((e) => e.agencyId));
    return (initial?.mode ?? "PRIVATE") === "PUBLIC"
      ? new Set(agencies.filter((a) => !denied.has(a.id)).map((a) => a.id))
      : allowed;
  }, [initial, agencies]);

  const [available, setAvail] = useState<Set<string>>(initialAvailable);

  function toggle(id: string) {
    setAvail((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function save() {
    const entries =
      mode === "PRIVATE"
        ? [...available].map((id) => ({ agencyId: id, effect: "ALLOW" as const }))
        : agencies.filter((a) => !available.has(a.id)).map((a) => ({ agencyId: a.id, effect: "DENY" as const }));
    startTransition(async () => {
      const res = await setAvailability(productType, productId, { mode, entries });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Availability saved");
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Agency availability</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Which agencies may see this in their catalog.</p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg bg-zinc-100 p-0.5">
          {(["PRIVATE", "PUBLIC"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === m ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
              {m === "PRIVATE" ? "Allowlist" : "Public (exclusions)"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={() => setAvail(new Set(agencies.map((a) => a.id)))} className="text-xs font-semibold text-brand-600 hover:underline">Make all available</button>
        <span className="text-zinc-300">·</span>
        <button onClick={() => setAvail(new Set())} className="text-xs font-semibold text-zinc-500 hover:underline">Clear</button>
      </div>

      <ul className="mt-3 divide-y divide-zinc-50">
        {agencies.map((a) => {
          const on = available.has(a.id);
          return (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-2xs text-zinc-400">{on ? "available" : mode === "PUBLIC" ? "excluded" : "not available"}</p>
              </div>
              {on ? (
                <div className="flex items-center gap-2">
                  <Badge value="ACTIVE" />
                  <button onClick={() => toggle(a.id)} className="text-xs font-medium text-zinc-400 hover:text-danger-600">{mode === "PUBLIC" ? "Exclude" : "Remove"}</button>
                </div>
              ) : (
                <button onClick={() => toggle(a.id)} className="text-xs font-semibold text-brand-600 hover:underline">Make available</button>
              )}
            </li>
          );
        })}
        {agencies.length === 0 && <li className="py-2.5 text-xs text-zinc-400">No active agencies yet.</li>}
      </ul>

      <div className="mt-4 flex justify-end">
        <PrimaryButton onClick={save} disabled={pending}>{pending ? "Saving…" : "Save availability"}</PrimaryButton>
      </div>
    </Card>
  );
}
