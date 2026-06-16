import Link from "next/link";
import {
  FX_COMMISSIONS, FX_INSTALLATIONS, FX_STORES, FX_TICKETS, FX_AGENCY_APPS, FX_APPS,
  FX_REVENUE_SERIES, formatMoney, resolveRateBps, formatRate,
} from "@nova/shared";
import { Badge, Card, Table, Td } from "@/components/ui";
import { AreaChart, Sparkline, HBar, Donut } from "@/components/charts";

const MY_AGENCY = "acme";

export default async function TenantDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const commissions = FX_COMMISSIONS.filter((c) => c.agencySlug === MY_AGENCY);
  const pending = commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0);
  const approved = commissions.filter((c) => c.status === "APPROVED").reduce((s, c) => s + c.amount, 0);
  const paid = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0) + 1200;
  const openIssues = FX_TICKETS.filter((t) => t.agencySlug === MY_AGENCY && t.status !== "RESOLVED");

  // Agency earnings ≈ commission share of referred volume (demo series derived from platform)
  const series = FX_REVENUE_SERIES.map((s) => ({ label: s.week, value: Math.round(s.revenue * 0.55 * 0.25) }));
  const lastWeek = series[series.length - 1].value;
  const prevWeek = series[series.length - 2].value;
  const delta = prevWeek ? `${lastWeek >= prevWeek ? "+" : ""}${(((lastWeek - prevWeek) / prevWeek) * 100).toFixed(1)}%` : "—";

  const myApps = FX_AGENCY_APPS.filter((x) => x.agencySlug === MY_AGENCY).map((x) => {
    const app = FX_APPS.find((a) => a.slug === x.appSlug)!;
    const earned = commissions.filter((c) => c.appSlug === x.appSlug && c.status !== "REVERSED").reduce((s, c) => s + c.amount, 0);
    return {
      app,
      earned,
      installs: FX_INSTALLATIONS.filter((i) => i.appSlug === x.appSlug && i.agencySlug === MY_AGENCY && i.status === "ACTIVE").length,
      rate: resolveRateBps(MY_AGENCY, x.appSlug),
    };
  }).sort((a, b) => b.earned - a.earned);
  const maxEarned = Math.max(1, ...myApps.map((a) => a.earned));

  const kpis = [
    { label: "Weekly earnings", value: formatMoney(lastWeek), delta, up: lastWeek >= prevWeek, spark: series.map((s) => s.value) },
    { label: "Pending", value: formatMoney(pending), delta: "maturing — clears refund window", up: true, spark: undefined },
    { label: "Approved", value: formatMoney(approved), delta: "next payout batch", up: true, spark: undefined },
    { label: "Paid out (lifetime)", value: formatMoney(paid), delta: "+$12.00 last batch", up: true, spark: undefined },
  ];

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-semibold capitalize tracking-tight">{slug}</h1>
          <p className="mt-1 text-body text-zinc-500">Your portfolio at a glance.</p>
        </div>
        <span className="text-2xs text-zinc-400">Demo data · live in Phase 3</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-zinc-400">{k.label}</p>
                <p className="mt-1.5 text-xl font-semibold tracking-tight">{k.value}</p>
              </div>
              {k.spark && <Sparkline data={k.spark} />}
            </div>
            <p className={`mt-1.5 text-2xs font-medium ${k.up ? "text-success-600" : "text-danger-600"}`}>{k.delta}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Earnings</h2>
            <span className="text-2xs text-zinc-400">last 12 weeks</span>
          </div>
          <div className="mt-3">
            <AreaChart data={series} valueFormat="money" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Your apps</h2>
            <Link href="/apps" className="text-2xs font-medium text-brand-600 hover:underline">Catalog →</Link>
          </div>
          <ul className="mt-4 space-y-4">
            {myApps.map((a) => (
              <li key={a.app.slug}>
                <div className="mb-1.5 flex items-center justify-between text-body">
                  <Link href={`/apps/${a.app.slug}`} className="font-medium hover:underline">{a.app.name}</Link>
                  <span className="font-semibold">{formatMoney(a.earned)}</span>
                </div>
                <HBar value={a.earned} max={maxEarned} />
                <p className="mt-1 text-2xs text-zinc-400">
                  {a.installs} installs · {formatRate(a.rate)} rate
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-semibold">Commission status</h2>
          <div className="mt-4">
            <Donut
              centerLabel="entries"
              centerValue={String(commissions.length)}
              segments={[
                { label: "Paid", value: commissions.filter((c) => c.status === "PAID").length, color: "#15803D" },
                { label: "Approved", value: commissions.filter((c) => c.status === "APPROVED").length, color: "#57534E" },
                { label: "Pending", value: commissions.filter((c) => c.status === "PENDING").length, color: "#B45309" },
                { label: "Reversed", value: commissions.filter((c) => c.status === "REVERSED").length, color: "#E7E5E4" },
              ]}
            />
          </div>
          <Link href="/commissions" className="mt-4 inline-block text-2xs font-medium text-brand-600 hover:underline">
            View ledger →
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Needs attention</h2>
          <ul className="mt-3 space-y-2 text-body">
            {openIssues.map((t) => (
              <li key={t.id}>
                <Link href={`/support/${t.id}`} className="flex items-center justify-between rounded-lg bg-warning-50 px-3 py-2.5 transition-colors hover:bg-warning-100/60">
                  <span className="mr-2 flex items-center gap-2 truncate">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" />
                    <span className="truncate">{t.subject}</span>
                  </span>
                  <Badge value={t.status} />
                </Link>
              </li>
            ))}
            {openIssues.length === 0 && <li className="text-zinc-400">All clear 🎉</li>}
          </ul>
          <Link href="/support" className="mt-3 inline-block text-2xs font-medium text-brand-600 hover:underline">
            Support →
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Portfolio</h2>
          <dl className="mt-3 space-y-2.5 text-body">
            <div className="flex justify-between"><dt className="text-zinc-500">Connected stores</dt><dd className="font-semibold">{FX_STORES.filter((s) => s.agencySlug === MY_AGENCY).length}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Active installs</dt><dd className="font-semibold">{FX_INSTALLATIONS.filter((i) => i.agencySlug === MY_AGENCY && i.status === "ACTIVE").length}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Assigned apps</dt><dd className="font-semibold">{myApps.length}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Frozen subscriptions</dt><dd className="font-semibold">{FX_INSTALLATIONS.filter((i) => i.agencySlug === MY_AGENCY && i.subscriptionStatus === "frozen").length}</dd></div>
          </dl>
          <Link href="/stores" className="mt-3 inline-block text-2xs font-medium text-brand-600 hover:underline">
            Stores →
          </Link>
        </Card>
      </div>

      <h2 className="mb-3 mt-6 font-semibold">Recent commissions</h2>
      <Table head={["App", "Store", "Commission", "Status", "Date"]}>
        {commissions.slice(0, 5).map((c) => (
          <tr key={c.id} className="hover:bg-zinc-100">
            <Td className="text-xs font-medium">{c.appSlug}</Td>
            <Td className="text-xs text-zinc-500">{c.shopDomain}</Td>
            <Td className={`font-semibold ${c.amount < 0 ? "text-danger-600" : ""}`}>{formatMoney(c.amount)}</Td>
            <Td><Badge value={c.status} /></Td>
            <Td className="text-xs text-zinc-500">{c.createdAt}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
