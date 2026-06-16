import { formatMoney } from "@nova/shared";
import { getTool, getPlans } from "@/lib/api";
import { Table, Td } from "@/components/ui";
import { NotConnected } from "@/components/shell-states";

export default async function PlansPage({ params }: { params: Promise<{ toolSlug: string }> }) {
  const { toolSlug } = await params;
  const tool = await getTool(toolSlug);
  if (!tool) return <NotConnected slug={toolSlug} />;
  const plans = (await getPlans(tool.id)) ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="font-semibold tracking-tight">Plans</h1>
      <p className="mt-1 text-body text-zinc-500">Agency-facing pricing. Stripe wiring (products/prices/meters) lands with P6 — metadata for now.</p>
      <div className="mt-4">
        <Table head={["Plan", "Model", "Base", "Trial", "Per-store"]}>
          {plans.map((p) => (
            <tr key={p.id} className="hover:bg-zinc-100">
              <Td className="font-medium">{p.name}</Td>
              <Td><span className="rounded bg-zinc-100 px-1.5 py-0.5 text-2xs font-medium text-zinc-600">{p.model}</span></Td>
              <Td>{p.baseAmount === 0 ? "—" : `${formatMoney(p.baseAmount, p.currency)}/${p.interval === "ANNUAL" ? "yr" : "mo"}`}</Td>
              <Td>{p.trialDays > 0 ? `${p.trialDays}d` : "—"}</Td>
              <Td>{p.perStore && p.perStoreAmount ? `${formatMoney(p.perStoreAmount, p.currency)}/store` : "—"}</Td>
            </tr>
          ))}
          {plans.length === 0 && (
            <tr><Td className="text-zinc-400">No plans yet — add them from the platform admin Tools pillar.</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
          )}
        </Table>
      </div>
    </div>
  );
}
