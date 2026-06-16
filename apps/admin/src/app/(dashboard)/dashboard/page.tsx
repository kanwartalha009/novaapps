import Link from "next/link";
import { formatMoney } from "@nova/shared";
import { getMe, getAdminOverview } from "@/lib/api";
import { Card } from "@/components/ui";
import { HBar } from "@/components/charts";

/** Admin overview — real App-revenue KPIs from /admin/metrics/overview (P2).
 *  Richer time-series charts + activity feed arrive with the metrics module (later phase). */
export default async function DashboardPage() {
  const [me, o] = await Promise.all([getMe(), getAdminOverview()]);
  const maxAppRevenue = Math.max(1, ...o.byApp.map((a) => a.gross));

  const kpis = [
    { label: "Gross revenue", value: formatMoney(o.grossAllTime), hint: "all time, net of refunds" },
    { label: "Last 30 days", value: formatMoney(o.gross30d), hint: "subscription + one-time" },
    { label: "Active installs", value: String(o.activeInstalls), hint: "across all apps" },
    { label: "Pending commissions", value: formatMoney(o.commissions.pending), hint: "awaiting approval" },
  ];

  const attention = [
    { dot: "bg-warning-600", label: "Agency applications awaiting review", count: String(o.pendingAgencies), href: "/agencies" },
    { dot: "bg-zinc-400", label: "Commissions to approve", count: formatMoney(o.commissions.pending), href: "/commissions" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-body text-zinc-500">Welcome back, {me?.name ?? "Operator"} — your platform at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex flex-col justify-between p-5">
            <p className="text-xs font-medium text-zinc-500">{k.label}</p>
            <div className="mt-2">
              <p className="num text-xl font-semibold tracking-tight text-zinc-900">{k.value}</p>
              <p className="mt-0.5 text-2xs text-zinc-400">{k.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <h2 className="font-semibold">Revenue by app</h2>
          <ul className="mt-4 space-y-4">
            {o.byApp.map((a) => (
              <li key={a.slug}>
                <div className="mb-1.5 flex items-center justify-between text-body">
                  <Link href={`/apps/${a.slug}`} className="font-medium hover:underline">{a.name}</Link>
                  <span className="num font-semibold">{formatMoney(a.gross)}</span>
                </div>
                <HBar value={a.gross} max={maxAppRevenue} />
              </li>
            ))}
            {o.byApp.length === 0 && <li className="text-sm text-zinc-400">No revenue yet.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Needs attention</h2>
          <ul className="mt-2 divide-y divide-zinc-100">
            {attention.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className="group flex h-11 items-center justify-between gap-2 transition-colors hover:bg-zinc-50">
                  <span className="flex min-w-0 items-center gap-2.5 text-body text-zinc-700">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                    <span className="truncate">{a.label}</span>
                  </span>
                  <span className="num rounded-md bg-zinc-100 px-1.5 py-0.5 text-2xs font-semibold text-zinc-600">{a.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
