import { formatMoney } from "@nova/shared";
import { listSubscriptions, getProjectedSpend } from "@/lib/api";
import { PageHeader, Badge, Card, Stat, Table, Td } from "@/components/ui";

/** Tool billing — what the agency pays Nova (separate from app commissions, I-14). P6. */
export default async function SubscriptionsPage() {
  const [subs, spend] = await Promise.all([listSubscriptions(), getProjectedSpend()]);
  const baseTotal = spend.reduce((s, r) => s + r.baseAmount, 0);
  const currency = spend[0]?.currency ?? "USD";

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        desc="Tools you pay Nova for. Billing is entirely separate from the commissions you earn on apps."
      />

      <div className="mb-6 grid max-w-2xl grid-cols-2 gap-4">
        <Stat label="Projected base this period" value={formatMoney(baseTotal, currency)} hint="+ metered usage" />
        <Stat label="Active tools" value={String(subs.filter((s) => s.status === "ACTIVE" || s.status === "TRIALING").length)} />
      </div>

      {spend.length > 0 && (
        <Card className="mb-6 p-5">
          <h2 className="font-semibold">Projected spend by tool</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {spend.map((r) => (
              <li key={r.tool} className="flex items-center justify-between border-b border-zinc-50 py-1.5">
                <span className="text-zinc-600">{r.name} <span className="text-2xs text-zinc-400">· {r.plan}</span></span>
                <span className="font-medium">
                  {formatMoney(r.baseAmount, r.currency)}
                  {r.meteredUnits > 0 && <span className="ml-2 text-2xs text-zinc-400">+ {r.meteredUnits} metered units</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Table head={["Tool", "Plan", "Status", "Trial ends", "Renews"]}>
        {subs.map((s) => (
          <tr key={s.id} className="hover:bg-zinc-100">
            <Td className="font-medium">{s.tool.name}</Td>
            <Td>{s.toolPlan.name}</Td>
            <Td><Badge value={s.status} /></Td>
            <Td className="text-xs text-zinc-500">{s.trialEndsAt ? new Date(s.trialEndsAt).toLocaleDateString() : "—"}</Td>
            <Td className="text-xs text-zinc-500">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}</Td>
          </tr>
        ))}
        {subs.length === 0 && (
          <tr><Td className="text-zinc-400">No subscriptions yet — start a trial from the Tools catalog.</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>
    </div>
  );
}
