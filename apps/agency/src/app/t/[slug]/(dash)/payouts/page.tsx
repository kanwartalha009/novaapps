"use client";

import { useState } from "react";
import { FX_PAYOUTS, FX_PAYOUT_METHODS, formatMoney } from "@nova/shared";
import { PageHeader, Badge, Card, Table, Td, Mono } from "@/components/ui";
import { SlideOver, Field, TextInput, Select, PrimaryButton, GhostButton } from "@/components/overlay";

/** Payouts — method management in a slide-over; wires to /v1/agencies/me/payout-methods (Phase 4). */
export default function PayoutsPage() {
  const mine = FX_PAYOUTS.filter((p) => p.agencySlug === "acme");
  const [methods, setMethods] = useState(FX_PAYOUT_METHODS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [provider, setProvider] = useState<"STRIPE_CONNECT" | "PAYPAL" | "MANUAL">("STRIPE_CONNECT");

  function addMethod() {
    setPanelOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Payouts"
        desc="Your payout history and destinations. Approved commissions batch into payouts after the 30-day maturity window."
        action={<PrimaryButton onClick={() => setPanelOpen(true)} className="px-3.5">+ Add payout method</PrimaryButton>}
      />

      <h2 className="mb-3 font-semibold">Payout methods</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((m) => (
          <Card key={m.provider} className="p-5">
            <div className="flex items-center justify-between">
              <Badge value={m.provider} />
              {m.isDefault && <span className="text-2xs font-bold uppercase text-success-600">Default</span>}
            </div>
            <p className="mt-3 text-sm font-medium">{m.label}</p>
            <p className="mt-1 text-xs text-zinc-500">{m.detailsMasked}</p>
            {!m.isDefault && (
              <button
                onClick={() => setMethods((ms) => ms.map((x) => ({ ...x, isDefault: x.provider === m.provider })))}
                className="mt-3 text-xs text-brand-600 hover:underline"
              >
                Make default
              </button>
            )}
          </Card>
        ))}
      </div>

      <h2 className="mb-3 font-semibold">History</h2>
      <Table head={["Batch", "Provider", "Commissions", "Total", "Status", "Reference", "Released"]}>
        {mine.map((p) => (
          <tr key={p.id} className="hover:bg-zinc-100">
            <Td><Mono>{p.id}</Mono></Td>
            <Td><Badge value={p.provider} /></Td>
            <Td>{p.commissionCount}</Td>
            <Td className="font-semibold">{formatMoney(p.totalAmount, p.currency)}</Td>
            <Td><Badge value={p.status} /></Td>
            <Td className="text-xs">{p.providerRef ? <Mono>{p.providerRef}</Mono> : "—"}</Td>
            <Td className="text-xs text-zinc-500">{p.releasedAt ?? "—"}</Td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-zinc-400">
        Balances under $50 roll into the next cycle.
      </p>

      <SlideOver
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Add payout method"
        desc="Choose how Nova releases your approved commissions."
        footer={
          <>
            <GhostButton onClick={() => setPanelOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={addMethod}>
              {provider === "STRIPE_CONNECT" ? "Continue to Stripe →" : "Save method"}
            </PrimaryButton>
          </>
        }
      >
        <Field label="Provider">
          <Select value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
            <option value="STRIPE_CONNECT">Stripe Connect — automated transfers</option>
            <option value="PAYPAL">PayPal — works in most countries</option>
            <option value="MANUAL">Bank transfer — manual release by Nova</option>
          </Select>
        </Field>

        {provider === "STRIPE_CONNECT" && (
          <div className="rounded-lg bg-zinc-50 p-3.5 text-body text-zinc-600">
            You'll be redirected to Stripe Express onboarding. Once verified, payouts release
            automatically — no action needed on your side.
          </div>
        )}
        {provider === "PAYPAL" && (
          <Field label="PayPal email">
            <TextInput type="email" placeholder="payouts@youragency.com" />
          </Field>
        )}
        {provider === "MANUAL" && (
          <>
            <Field label="Account holder">
              <TextInput placeholder="Acme Digital Ltd" />
            </Field>
            <Field label="IBAN / account number">
              <TextInput placeholder="PK00 XXXX 0000 0000 0000 0000" />
            </Field>
            <Field label="Bank name" hint="Stored encrypted. The Nova team releases these payouts manually and records a transfer reference.">
              <TextInput placeholder="Meezan Bank" />
            </Field>
          </>
        )}
      </SlideOver>
    </div>
  );
}
