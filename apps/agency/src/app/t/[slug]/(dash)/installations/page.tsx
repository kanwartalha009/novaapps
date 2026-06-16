import { FX_INSTALLATIONS, FX_APPS } from "@nova/shared";
import { PageHeader, Badge, Table, Td, Mono } from "@/components/ui";

export default function InstallationsPage() {
  const mine = FX_INSTALLATIONS.filter((i) => i.agencySlug === "acme");
  return (
    <div>
      <PageHeader
        title="Installations"
        desc="Apps you've installed on client stores. Attribution is locked to your agency for the lifetime of each install."
      />
      <Table head={["App", "Store", "Plan", "Status", "Shopify subscription", "Installed"]}>
        {mine.map((i) => (
          <tr key={i.id} className="hover:bg-zinc-100">
            <Td className="font-medium">{FX_APPS.find((a) => a.slug === i.appSlug)?.name}</Td>
            <Td><Mono>{i.shopDomain}</Mono></Td>
            <Td>{i.planName ?? "—"}</Td>
            <Td><Badge value={i.status} /></Td>
            <Td>{i.subscriptionStatus ? <Badge value={i.subscriptionStatus} /> : <span className="text-xs text-zinc-400">free plan</span>}</Td>
            <Td className="text-xs text-zinc-500">{i.installedAt ?? "awaiting merchant approval"}</Td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-zinc-400">
        “frozen” = the shop's Shopify subscription is unpaid; billing (and your commission) resumes automatically when it reactivates.
      </p>
    </div>
  );
}
