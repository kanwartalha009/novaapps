"use client";

import { useMemo, useState } from "react";
import { FX_PAYOUTS, FX_COMMISSIONS, FX_AGENCIES, formatMoney } from "@nova/shared";
import { PageHeader, Badge, Table, Td, Mono } from "@/components/ui";
import { SlideOver, Field, TextInput, Select, PrimaryButton, GhostButton } from "@/components/overlay";

/** Payouts — batch creation in a modal with live preview; release with reference capture. */
export default function PayoutsPage() {
  const [rows, setRows] = useState(FX_PAYOUTS);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchAgency, setBatchAgency] = useState("acme");
  const [releasing, setReleasing] = useState<string | null>(null);
  const [ref, setRef] = useState("");

  const eligible = useMemo(
    () => FX_COMMISSIONS.filter((c) => c.agencySlug === batchAgency && c.status === "APPROVED"),
    [batchAgency],
  );
  const eligibleTotal = eligible.reduce((s, c) => s + c.amount, 0);

  function createBatch() {
    setRows((rs) => [
      { id: `po_${rs.length + 10}`, agencySlug: batchAgency, provider: "MANUAL" as const, providerRef: null, status: "DRAFT" as const, totalAmount: eligibleTotal, currency: "USD", commissionCount: eligible.length, createdAt: "2026-06-10", releasedAt: null },
      ...rs,
    ]);
    setBatchOpen(false);
  }

  function release(id: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "PAID" as const, providerRef: ref || "MANUAL-REF", releasedAt: "2026-06-10" } : r)));
    setReleasing(null); setRef("");
  }

  return (
    <div>
      <PageHeader
        title="Payouts"
        desc="Batches of approved commissions per agency, released via provider drivers: manual transfer, Stripe Connect, or PayPal."
        action={<PrimaryButton onClick={() => setBatchOpen(true)} className="px-3.5">+ Create batch</PrimaryButton>}
      />
      <Table head={["Batch", "Agency", "Provider", "Commissions", "Total", "Status", "Reference", "Released", ""]}>
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-zinc-100">
            <Td><Mono>{p.id}</Mono></Td>
            <Td>{p.agencySlug}</Td>
            <Td><Badge value={p.provider} /></Td>
            <Td>{p.commissionCount}</Td>
            <Td className="font-semibold">{formatMoney(p.totalAmount, p.currency)}</Td>
            <Td><Badge value={p.status} /></Td>
            <Td className="text-xs">{p.providerRef ? <Mono>{p.providerRef}</Mono> : "—"}</Td>
            <Td className="text-xs text-zinc-500">{p.releasedAt ?? "—"}</Td>
            <Td className="text-right">
              {p.status === "DRAFT" && (
                <PrimaryButton onClick={() => setReleasing(p.id)} className="bg-zinc-900 px-2.5 py-1 text-xs hover:bg-zinc-800">
                  Release
                </PrimaryButton>
              )}
            </Td>
          </tr>
        ))}
      </Table>

      {/* Create batch */}
      <SlideOver
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title="Create payout batch"
        desc="Gathers all APPROVED, unassigned commissions for the agency."
        footer={
          <>
            <GhostButton onClick={() => setBatchOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={createBatch} disabled={eligible.length === 0}>
              Create draft batch
            </PrimaryButton>
          </>
        }
      >
        <Field label="Agency">
          <Select value={batchAgency} onChange={(e) => setBatchAgency(e.target.value)}>
            {FX_AGENCIES.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </Select>
        </Field>
        <div className="rounded-lg bg-zinc-50 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Preview</p>
          {eligible.length > 0 ? (
            <>
              <ul className="mt-2 space-y-1">
                {eligible.map((c) => (
                  <li key={c.id} className="flex justify-between text-body">
                    <span className="text-zinc-600">{c.appSlug} · {c.shopDomain}</span>
                    <span className="font-medium">{formatMoney(c.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-sm font-semibold">
                <span>Total ({eligible.length} commissions)</span>
                <span>{formatMoney(eligibleTotal)}</span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-body text-zinc-400">No approved, unassigned commissions for this agency.</p>
          )}
        </div>
      </SlideOver>

      {/* Release */}
      <SlideOver
        open={!!releasing}
        onClose={() => setReleasing(null)}
        title="Release payout"
        desc="Manual provider: record the external transfer reference to mark this batch PAID."
        footer={
          <>
            <GhostButton onClick={() => setReleasing(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={() => releasing && release(releasing)} className="bg-zinc-900 hover:bg-zinc-800">
              Confirm release
            </PrimaryButton>
          </>
        }
      >
        <Field label="Transfer reference" hint="e.g. your bank or Wise transaction ID — stored on the payout for audit.">
          <TextInput value={ref} onChange={(e) => setRef(e.target.value)} placeholder="WISE-20260610-001" />
        </Field>
      </SlideOver>
    </div>
  );
}
