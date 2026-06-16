"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney, formatRate } from "@nova/shared";
import type { CommissionAdminView, AgencyLite } from "@/lib/api";
import { approveCommission, adjustCommission } from "@/lib/actions";
import { PageHeader, Badge, Stat, Table, Td, Mono } from "@/components/ui";
import { SlideOver, Field, TextInput, TextArea, Select, PrimaryButton, GhostButton } from "@/components/overlay";

/** Commissions — approve inline + manual ADJUSTMENT (typed ledger entry, I-5), wired to the API. */
export function CommissionsClient({ rows, agencies }: { rows: CommissionAdminView[]; agencies: AgencyLite[] }) {
  const router = useRouter();
  const [pendingTx, startTransition] = useTransition();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjAgency, setAdjAgency] = useState(agencies[0]?.id ?? "");

  const pending = rows.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0);
  const approved = rows.filter((c) => c.status === "APPROVED").reduce((s, c) => s + c.amount, 0);

  function approve(id: string) {
    startTransition(async () => {
      const res = await approveCommission(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Commission approved");
      router.refresh();
    });
  }

  function submitAdjustment() {
    startTransition(async () => {
      const res = await adjustCommission({
        agencyId: adjAgency,
        amount: Math.round(Number(adjAmount) * 100),
        reason: adjReason,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Adjustment created");
      setAdjustOpen(false);
      setAdjAmount("");
      setAdjReason("");
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="Commissions"
        desc="Auto-calculated from charges (rate snapshotted per row). Refunds create reversals — rows are never edited."
        action={<GhostButton onClick={() => setAdjustOpen(true)} className="px-3.5">+ Manual adjustment</GhostButton>}
      />
      <div className="mb-6 grid max-w-2xl grid-cols-2 gap-4">
        <Stat label="Pending approval" value={formatMoney(pending)} hint="this page" />
        <Stat label="Approved, unpaid" value={formatMoney(approved)} hint="this page" />
      </div>
      <Table head={["ID", "Agency", "App / store", "Basis", "Rate", "Commission", "Type", "Status", ""]}>
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-zinc-100">
            <Td><Mono>{c.id.slice(0, 10)}</Mono></Td>
            <Td>{c.agency?.slug ?? "—"}</Td>
            <Td>
              <p className="text-xs font-medium">{c.charge?.installation?.app?.slug ?? "—"}</p>
              <p className="text-xs text-zinc-400">{c.charge?.installation?.store?.shopDomain ?? ""}</p>
            </Td>
            <Td className="text-xs">{c.basisAmount !== 0 ? formatMoney(c.basisAmount, c.currency) : "—"}</Td>
            <Td className="text-xs">{c.rateBps !== 0 ? formatRate(c.rateBps) : "—"}</Td>
            <Td className={c.amount < 0 ? "font-semibold text-danger-600" : "font-semibold"}>
              {formatMoney(c.amount, c.currency)}
            </Td>
            <Td><Badge value={c.type} /></Td>
            <Td><Badge value={c.status} /></Td>
            <Td className="text-right">
              {c.status === "PENDING" && (
                <PrimaryButton onClick={() => approve(c.id)} disabled={pendingTx} className="px-2.5 py-1 text-xs">
                  Approve
                </PrimaryButton>
              )}
            </Td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><Td className="text-zinc-400">No commissions yet</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>

      <SlideOver
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Manual adjustment"
        desc="Creates a typed ADJUSTMENT ledger entry — existing rows are never edited (invariant I-5)."
        footer={
          <>
            <GhostButton onClick={() => setAdjustOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={submitAdjustment} disabled={!adjAmount || !adjReason.trim() || !adjAgency || pendingTx}>
              Create adjustment
            </PrimaryButton>
          </>
        }
      >
        <Field label="Agency">
          <Select value={adjAgency} onChange={(e) => setAdjAgency(e.target.value)}>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Amount (USD)" hint="Negative to claw back; positive to credit.">
          <TextInput value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} type="number" step="0.01" placeholder="-19.75" />
        </Field>
        <Field label="Reason" hint="Required — recorded on the ledger entry for audit.">
          <TextArea value={adjReason} onChange={(e) => setAdjReason(e.target.value)} rows={4} placeholder="Why is this adjustment needed?" />
        </Field>
      </SlideOver>
    </div>
  );
}
