import { notFound } from "next/navigation";
import {
  FX_APPS, FX_AGENCY_APPS, FX_INSTALLATIONS, FX_CHARGES, FX_COMMISSIONS, FX_TICKETS,
  formatMoney, formatRate, resolveRateBps,
} from "@nova/shared";
import { Badge, Card, Stat, Table, Td, Mono } from "@/components/ui";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

const MY_AGENCY = "acme"; // fixture tenant

/**
 * Per-app dashboard for the agency: users (installs), financials, and issues
 * needing attention — everything scoped by appId (spec: support.md scale posture).
 */
export default async function AgencyAppDashboard({
  params,
}: {
  params: Promise<{ slug: string; appSlug: string }>;
}) {
  const { appSlug } = await params;
  const app = FX_APPS.find((a) => a.slug === appSlug);
  const assigned = FX_AGENCY_APPS.some((x) => x.agencySlug === MY_AGENCY && x.appSlug === appSlug);
  if (!app || !assigned) notFound();

  const installs = FX_INSTALLATIONS.filter((i) => i.appSlug === appSlug && i.agencySlug === MY_AGENCY);
  const charges = FX_CHARGES.filter((c) => c.appSlug === appSlug && c.agencySlug === MY_AGENCY);
  const commissions = FX_COMMISSIONS.filter((c) => c.appSlug === appSlug && c.agencySlug === MY_AGENCY);
  const tickets = FX_TICKETS.filter((t) => t.appSlug === appSlug && t.agencySlug === MY_AGENCY);
  const openTickets = tickets.filter((t) => t.status !== "RESOLVED");

  const earned = commissions.filter((c) => c.status !== "REVERSED").reduce((s, c) => s + c.amount, 0);
  const mrr = charges.filter((c) => c.type === "SUBSCRIPTION" && c.occurredAt >= "2026-06-01").reduce((s, c) => s + c.amount, 0);
  const rate = resolveRateBps(MY_AGENCY, appSlug);

  return (
    <div>
      <Breadcrumbs items={[{ label: "App catalog", href: "/apps" }, { label: app.name }]} />
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="font-semibold tracking-tight">{app.name}</h1>
          <p className="mt-1 text-body text-zinc-500">{app.tagline}</p>
        </div>
        <span className="rounded-md bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600">
          {formatRate(rate)} commission
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active installs" value={String(installs.filter((i) => i.status === "ACTIVE").length)} hint={`${installs.length} total via your agency`} />
        <Stat label="June subscription volume" value={formatMoney(mrr)} hint="your referred stores" />
        <Stat label="Commission earned" value={formatMoney(earned)} hint="lifetime, this app" />
        <Stat label="Open issues" value={String(openTickets.length)} hint={openTickets.length > 0 ? "needs attention" : "all clear"} />
      </div>

      {/* Issues needing attention */}
      {openTickets.length > 0 && (
        <Card className="mt-6 border-warning-300 bg-warning-50/40 p-5">
          <h2 className="font-semibold text-warning-700">⚠ Issues needing attention</h2>
          <ul className="mt-3 space-y-2">
            {openTickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{t.subject}</p>
                  <p className="text-2xs text-zinc-400">
                    <Mono>{t.shopDomain}</Mono> · {t.priority} · last activity {t.lastActivityAt}
                  </p>
                </div>
                <Badge value={t.status} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-2xs text-warning-700">
            Nova support is handling these — you can follow along and comment from here (read-only + comment per spec).
          </p>
        </Card>
      )}

      {/* Users (installs) */}
      <h2 className="mb-3 mt-8 font-semibold">Store users</h2>
      <Table head={["Store", "Plan", "Install status", "Shopify subscription", "Installed"]}>
        {installs.map((i) => (
          <tr key={i.id} className="hover:bg-zinc-100">
            <Td><Mono>{i.shopDomain}</Mono></Td>
            <Td>{i.planName ?? "—"}</Td>
            <Td><Badge value={i.status} /></Td>
            <Td>{i.subscriptionStatus ? <Badge value={i.subscriptionStatus} /> : <span className="text-xs text-zinc-400">free plan</span>}</Td>
            <Td className="text-xs text-zinc-500">{i.installedAt ?? "—"}</Td>
          </tr>
        ))}
      </Table>

      {/* Financials */}
      <h2 className="mb-3 mt-8 font-semibold">Financials</h2>
      <Table head={["Charge", "Store", "Type", "Amount", "Your commission", "Status", "Date"]}>
        {charges.map((c) => {
          const cm = commissions.find((x) => x.chargeId === c.id);
          return (
            <tr key={c.id} className="hover:bg-zinc-100">
              <Td><Mono>{c.externalId.replace("gid://shopify/", "")}</Mono></Td>
              <Td className="text-xs text-zinc-500">{c.shopDomain}</Td>
              <Td><Badge value={c.type} /></Td>
              <Td className={`text-body ${c.amount < 0 ? "text-danger-600" : ""}`}>{formatMoney(c.amount, c.currency)}</Td>
              <Td className={`font-semibold ${cm && cm.amount < 0 ? "text-danger-600" : ""}`}>{cm ? formatMoney(cm.amount, cm.currency) : "—"}</Td>
              <Td>{cm ? <Badge value={cm.status} /> : "—"}</Td>
              <Td className="text-xs text-zinc-500">{c.occurredAt}</Td>
            </tr>
          );
        })}
      </Table>

      {/* Resolved history */}
      {tickets.some((t) => t.status === "RESOLVED") && (
        <>
          <h2 className="mb-3 mt-8 font-semibold">Resolved issues</h2>
          <Table head={["Issue", "Store", "Handled by", "Resolved"]}>
            {tickets.filter((t) => t.status === "RESOLVED").map((t) => (
              <tr key={t.id}>
                <Td className="text-body">{t.subject}</Td>
                <Td className="text-xs"><Mono>{t.shopDomain}</Mono></Td>
                <Td className="text-xs">{t.botHandled ? "🤖 automatic chat" : "support team"}</Td>
                <Td className="text-xs text-zinc-500">{t.lastActivityAt}</Td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </div>
  );
}
