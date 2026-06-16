"use client";

import { useState } from "react";
import { FX_SETTINGS, formatMoney } from "@nova/shared";
import { PageHeader, Card } from "@/components/ui";
import { Field, TextInput, Select, PrimaryButton, GhostButton } from "@/components/overlay";

/** Platform settings — grouped sections, single save affordance. Wires to PATCH /v1/admin/settings (Phase 3). */
export default function SettingsPage() {
  const [s, setS] = useState(FX_SETTINGS);
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-[560px]">
      <PageHeader title="Settings" desc="Platform-wide commission, payout, and support defaults." />

      <form
        className="form-grid"
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        <Card className="p-5">
          <h2 className="font-semibold">Commissions</h2>
          <p className="mb-5 mt-0.5 text-xs text-zinc-500">How agency earnings are calculated from charges.</p>

          <Field label="Default commission rate (%)" hint="Applies unless an agency or assignment has a custom rate. Snapshotted per commission — changing this never rewrites history.">
            <TextInput
              type="number" min={0} max={100} step={0.25}
              value={s.defaultCommissionRateBps / 100}
              onChange={(e) => setS({ ...s, defaultCommissionRateBps: Math.round(Number(e.target.value) * 100) })}
            />
          </Field>
          <Field label="Commission basis">
            <Select
              value={s.commissionBasis}
              onChange={(e) => setS({ ...s, commissionBasis: e.target.value as "net" | "gross" })}
            >
              <option value="net">Net of Shopify revenue share</option>
              <option value="gross">Gross charge amount</option>
            </Select>
          </Field>
          <Field label="Commission maturity window (days)" hint="Covers Shopify refund windows before commissions become payable.">
            <TextInput
              type="number" min={0}
              value={s.commissionMaturityDays}
              onChange={(e) => setS({ ...s, commissionMaturityDays: Number(e.target.value) })}
            />
          </Field>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Payouts</h2>
          <p className="mb-5 mt-0.5 text-xs text-zinc-500">When approved balances are released to agencies.</p>

          <Field label="Minimum payout amount (USD)" hint={`Currently ${formatMoney(s.minPayoutAmount)} — balances below this roll into the next cycle.`}>
            <TextInput
              type="number" min={0} step={1}
              value={s.minPayoutAmount / 100}
              onChange={(e) => setS({ ...s, minPayoutAmount: Math.round(Number(e.target.value) * 100) })}
            />
          </Field>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Support bot</h2>
          <p className="mb-5 mt-0.5 text-xs text-zinc-500">Tier-0 automatic chat backend (ADR-006) — switch anytime without a deploy.</p>

          <Field label="Bot backend" hint="Per-app override available on each app.">
            <Select
              value={s.supportBotProvider}
              onChange={(e) => setS({ ...s, supportBotProvider: e.target.value as "RULES" | "LLM" })}
            >
              <option value="RULES">Rules engine — deterministic, registry-data answers</option>
              <option value="LLM">LLM — generative answers with strict guardrails</option>
            </Select>
          </Field>
        </Card>

        <div className="form-actions">
          <GhostButton type="button" onClick={() => setS(FX_SETTINGS)}>Cancel</GhostButton>
          <PrimaryButton type="submit">{saved ? "✓ Saved" : "Save changes"}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
