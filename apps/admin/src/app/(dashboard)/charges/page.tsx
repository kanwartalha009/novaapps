import { formatMoney } from "@nova/shared";
import { listCharges, getAdminOverview } from "@/lib/api";
import { PageHeader, Badge, Stat, Table, Td, Mono } from "@/components/ui";

/** Charges — append-only App revenue ledger, ingested from Shopify Billing webhooks (I-6). */
export default async function ChargesPage() {
  const [{ items }, overview] = await Promise.all([listCharges(), getAdminOverview()]);

  return (
    <div>
      <PageHeader
        title="Charges"
        desc="Revenue ledger — append-only, ingested from Shopify Billing webhooks (app_subscriptions/update, one-time, refunds)."
      />
      <div className="mb-6 grid max-w-2xl grid-cols-2 gap-4">
        <Stat label="Gross revenue (all time)" value={formatMoney(overview.grossAllTime)} hint="net of refunds" />
        <Stat label="Last 30 days" value={formatMoney(overview.gross30d)} />
      </div>
      <Table head={["Charge", "App", "Store", "Type", "Amount", "Date"]}>
        {items.map((c) => (
          <tr key={c.id} className="hover:bg-zinc-100">
            <Td><Mono>{c.externalId.replace("gid://shopify/", "")}</Mono></Td>
            <Td className="font-medium">{c.installation.app.name}</Td>
            <Td className="text-xs text-zinc-500">{c.installation.store.shopDomain}</Td>
            <Td><Badge value={c.type} /></Td>
            <Td className={c.amount < 0 ? "font-medium text-danger-600" : "font-medium"}>
              {formatMoney(c.amount, c.currency)}
            </Td>
            <Td className="text-xs text-zinc-500">{new Date(c.occurredAt).toLocaleDateString()}</Td>
          </tr>
        ))}
        {items.length === 0 && (
          <tr><Td className="text-zinc-400">No charges yet — they arrive from Shopify Billing webhooks.</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>
    </div>
  );
}
