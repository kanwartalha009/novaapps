"use client";

import { useState } from "react";
import { formatRate, formatMoney, type FxInstallation, type FxPlanOverride } from "@nova/shared";
import { SlideOver, Field, Select, TextInput, PrimaryButton, GhostButton, SecondaryButton } from "@/components/overlay";

function overrideLabel(o: FxPlanOverride): string {
  if (o.kind === "FREE") return "Comped free";
  if (o.kind === "PERCENT") return `−${formatRate(o.value ?? 0)}`;
  return `Flat ${formatMoney(o.value ?? 0)}`;
}

/**
 * Per-store comp / discount control (demo mode — local state).
 * Lets the operator bill one store free or discounted even on a paid plan.
 * Wires to PATCH /v1/admin/installations/:id { planOverride } in Phase 2;
 * the app reads the override when it creates the Shopify subscription.
 */
export function StoreCompControl({ installation }: { installation: FxInstallation }) {
  const [override, setOverride] = useState<FxPlanOverride | null>(installation.planOverride ?? null);
  const [open, setOpen] = useState(false);

  const [kind, setKind] = useState<"NONE" | FxPlanOverride["kind"]>(override?.kind ?? "NONE");
  const [value, setValue] = useState(override?.value != null ? String(override.value / 100) : "");
  const [reason, setReason] = useState(override?.reason ?? "");

  function openDrawer() {
    setKind(override?.kind ?? "NONE");
    setValue(override?.value != null ? String(override.value / 100) : "");
    setReason(override?.reason ?? "");
    setOpen(true);
  }

  function save() {
    if (kind === "NONE") setOverride(null);
    else if (kind === "FREE") setOverride({ kind: "FREE", reason: reason || undefined, setBy: "admin" });
    else setOverride({ kind, value: Math.round(Number(value) * 100), reason: reason || undefined, setBy: "admin" });
    setOpen(false);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{installation.planName ?? "—"}</span>
      {override && (
        <span
          className={`rounded-[4px] px-1.5 py-0.5 text-2xs font-semibold ${
            override.kind === "FREE" ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-600"
          }`}
          title={override.reason}
        >
          {overrideLabel(override)}
        </span>
      )}
      <button type="button" onClick={openDrawer} className="text-2xs font-medium text-brand-600 hover:underline">
        {override ? "edit" : "comp"}
      </button>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={`Plan override — ${installation.shopDomain}`}
        desc="Comp or discount this store even though the app is on a paid plan. The app honors it when it creates the subscription."
        footer={
          <>
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            {override && (
              <SecondaryButton onClick={() => { setOverride(null); setOpen(false); }}>Remove</SecondaryButton>
            )}
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Override">
            <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="NONE">No override (public plan price)</option>
              <option value="FREE">Comp — free</option>
              <option value="PERCENT">Discount — % off</option>
              <option value="FIXED">Custom flat price</option>
            </Select>
          </Field>
          {kind === "PERCENT" && (
            <Field label="Percent off" hint="e.g. 50 = 50% off the plan price.">
              <TextInput value={value} onChange={(e) => setValue(e.target.value)} type="number" min="0" max="100" className="w-28" />
            </Field>
          )}
          {kind === "FIXED" && (
            <Field label="Flat price (USD / mo)" hint="The store pays this instead of the plan price.">
              <TextInput value={value} onChange={(e) => setValue(e.target.value)} type="number" min="0" className="w-28" />
            </Field>
          )}
          <Field label="Reason" hint="Kept on the ledger trail — e.g. retainer client, launch partner.">
            <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nova retainer client — comped" />
          </Field>
          <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            Free comp → no charge, no commission. Discount → smaller charge; the commission derives from the reduced amount. The referral agency is unchanged.
          </p>
        </div>
      </SlideOver>
    </span>
  );
}
