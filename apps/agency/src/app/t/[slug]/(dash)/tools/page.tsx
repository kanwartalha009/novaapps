import { formatMoney } from "@nova/shared";
import { getCatalogTools, listEntitlements } from "@/lib/api";
import { PageHeader, Badge, Card } from "@/components/ui";
import { SubscribeButton } from "./subscribe-button";

/** Tools available to this agency + entitlement status (P3: GRANT-based; self-serve subscribe = P6). */
export default async function ToolsPage() {
  const [tools, entitlements] = await Promise.all([getCatalogTools(), listEntitlements()]);
  const accessByTool = new Map(entitlements.filter((e) => e.access).map((e) => [e.toolId, e.reason]));

  return (
    <div>
      <PageHeader
        title="Tools"
        desc="Agency software available to you (outreach, SEO, …). Separate from the apps you install on client stores."
      />
      {tools.length === 0 && (
        <Card className="p-5 text-center text-sm text-zinc-400">No tools available to your agency yet.</Card>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {tools.map((t) => {
          const reason = accessByTool.get(t.id);
          return (
            <Card key={t.slug} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">{t.description ?? ""}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge value={t.toolType} />
                  {reason ? (
                    <span className="text-2xs font-semibold text-success-600">Active · {reason}</span>
                  ) : (
                    <span className="text-2xs text-zinc-400">not active</span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1">
                {t.plans.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600">
                      {p.name}
                      {p.trialDays > 0 && <span className="text-xs text-zinc-400"> · {p.trialDays}-day trial</span>}
                    </span>
                    <span className="font-medium">
                      {p.baseAmount === 0
                        ? p.model === "FREE" ? "Free" : "Freemium"
                        : `${formatMoney(p.baseAmount, p.currency)}/${p.interval === "ANNUAL" ? "yr" : "mo"}`}
                      {p.perStore && p.perStoreAmount ? (
                        <span className="ml-1 text-xs text-zinc-400">+ {formatMoney(p.perStoreAmount, p.currency)}/store</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-4">
                {reason ? (
                  <span className="text-sm font-semibold text-success-600">✓ Active · {reason}</span>
                ) : (
                  <SubscribeButton toolId={t.id} plans={t.plans} />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
