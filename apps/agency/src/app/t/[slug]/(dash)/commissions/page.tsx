import { formatMoney } from "@nova/shared";
import { listCommissions, getCommissionSummary } from "@/lib/api";
import { PageHeader, Badge, Stat, Table, Td } from "@/components/ui";

/** Agency earnings — server-rendered from the API (P2). Rate is snapshotted per row; refunds = reversals. */
export default async function CommissionsPage() {
  const [rows, summary] = await Promise.all([listCommissions(), getCommissionSummary()]);

  return (
    <div>
      <PageHeader
        title="Commissions"
        desc="Every charge from your referred installs. Refunds appear as reversals."
        action={
          <a
            href="/api/commissions-statement"
            className="rounded-md border border-zinc-300 px-3.5 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            Export CSV
          </a>
        }
      />
      <div className="mb-6 grid max-w-3xl grid-cols-3 gap-4">
        <Stat label="Pending" value={formatMoney(summary.pending)} hint="maturing" />
        <Stat label="Approved" value={formatMoney(summary.approved)} hint="next payout" />
        <Stat label="Paid" value={formatMoney(summary.paid)} />
      </div>
      <Table head={["App", "Commission", "Type", "Status", "Date"]}>
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-zinc-100">
            <Td className="text-xs font-medium">{c.charge?.installation?.app?.name ?? "—"}</Td>
            <Td className={`font-semibold ${c.amount < 0 ? "text-danger-600" : ""}`}>
              {formatMoney(c.amount, c.currency)}
            </Td>
            <Td><Badge value={c.type} /></Td>
            <Td><Badge value={c.status} /></Td>
            <Td className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</Td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><Td className="text-zinc-400">No commissions yet</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>
    </div>
  );
}
