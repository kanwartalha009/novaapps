import { notFound } from "next/navigation";
import { FX_AGENCIES, FX_STORES, FX_COMMISSIONS, FX_SETTINGS, formatMoney, formatRate } from "@nova/shared";
import { PageHeader, Badge, Card, Table, Td, Mono } from "@/components/ui";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { ApproveAgencyButton } from "./approve-button";
import { AssignedApps } from "./assigned-apps";

export default async function AgencyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = FX_AGENCIES.find((a) => a.slug === slug);
  if (!agency) notFound();
  const stores = FX_STORES.filter((s) => s.agencySlug === slug);
  const commissions = FX_COMMISSIONS.filter((c) => c.agencySlug === slug);
  const earned = commissions.filter((c) => c.status !== "REVERSED").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="max-w-5xl">
      <Breadcrumbs items={[{ label: "Agencies", href: "/agencies" }, { label: agency.name }]} />
      <PageHeader
        title={agency.name}
        desc={`${agency.slug}.nova-apps.com · joined ${agency.createdAt}`}
        action={agency.status === "PENDING_APPROVAL" ? <ApproveAgencyButton /> : undefined}
      />
      <div className="mb-6"><Badge value={agency.status} /></div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-zinc-500">Commission rate</p>
          <p className="mt-1 text-2xl font-bold">
            {formatRate(agency.commissionRateBps ?? FX_SETTINGS.defaultCommissionRateBps)}
          </p>
          <p className="text-xs text-zinc-400">{agency.commissionRateBps ? "custom override" : "platform default"}</p>
          <button className="mt-2 text-xs text-brand-600 hover:underline">Change rate</button>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-zinc-500">Lifetime commission</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(earned)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-zinc-500">Connected stores</p>
          <p className="mt-1 text-2xl font-bold">{stores.length}</p>
        </Card>
      </div>

      <div className="mt-6">
        <AssignedApps agencySlug={agency.slug} agencyRateBps={agency.commissionRateBps} />
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Members</h2>
      <Table head={["Name", "Email", "Role"]}>
        {agency.members.map((m) => (
          <tr key={m.email}>
            <Td className="font-medium">{m.name}</Td>
            <Td className="text-zinc-500">{m.email}</Td>
            <Td><Badge value={m.role} /></Td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-8 font-semibold">Stores</h2>
      <Table head={["Shop domain", "Name", "Shopify plan", "Connected"]}>
        {stores.map((s) => (
          <tr key={s.id}>
            <Td><Mono>{s.shopDomain}</Mono></Td>
            <Td>{s.name}</Td>
            <Td className="text-xs">{s.shopifyPlan}</Td>
            <Td className="text-xs text-zinc-500">{s.connectedAt}</Td>
          </tr>
        ))}
        {stores.length === 0 && (
          <tr><Td className="text-zinc-400" >No stores connected yet</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>
    </div>
  );
}
