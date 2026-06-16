import { getTool, getBridge } from "@/lib/api";
import { Card, Badge } from "@/components/ui";
import { NotConnected } from "@/components/shell-states";

/** Store Bridge config (ADR-009). Runtime proxy lands in P5; this shows the declared scopes. */
export default async function BridgePage({ params }: { params: Promise<{ toolSlug: string }> }) {
  const { toolSlug } = await params;
  const tool = await getTool(toolSlug);
  if (!tool) return <NotConnected slug={toolSlug} />;
  const bridge = await getBridge(tool.id);

  return (
    <div className="max-w-3xl">
      <h1 className="font-semibold tracking-tight">Store Bridge</h1>
      <p className="mt-1 text-body text-zinc-500">
        Scoped, audited store access for STORE/HYBRID tools. Tools never hold raw Shopify tokens (I-13). Runtime proxy = P5.
      </p>
      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-600">Uses Store Bridge</span>
          <Badge value={bridge?.usesStoreBridge ? "ENABLED" : "DISABLED"} />
        </div>
        <div className="mt-3">
          <p className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">Required scopes (least privilege)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(bridge?.requiredScopes ?? []).map((s) => (
              <span key={s} className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-600">{s}</span>
            ))}
            {(bridge?.requiredScopes?.length ?? 0) === 0 && <span className="text-xs text-zinc-400">none</span>}
          </div>
        </div>
        <p className="mt-3 text-2xs text-zinc-400">
          Edit scopes via <code className="font-mono">PATCH /admin/tool-engine/tools/{tool.id}/bridge</code>; admin approves at release.
        </p>
      </Card>
    </div>
  );
}
