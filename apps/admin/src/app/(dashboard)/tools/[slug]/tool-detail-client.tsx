"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ToolAdminView, AgencyLite, AvailabilityView } from "@/lib/api";
import { publishTool, grantTool, revokeToolGrant } from "@/lib/actions";
import { Badge, Card } from "@/components/ui";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { AvailabilityMatrix } from "@/components/availability-matrix";

export function ToolDetailClient({
  tool,
  agencies,
  availability,
  grants,
}: {
  tool: ToolAdminView;
  agencies: AgencyLite[];
  availability: AvailabilityView | null;
  grants: Array<{ agencyId: string; status: "ACTIVE" | "INACTIVE" }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const granted = new Set(grants.filter((g) => g.status === "ACTIVE").map((g) => g.agencyId));

  function publish() {
    startTransition(async () => {
      const res = await publishTool(tool.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${tool.name} published`);
      router.refresh();
    });
  }

  function toggleGrant(agencyId: string, on: boolean) {
    startTransition(async () => {
      const res = on ? await revokeToolGrant(tool.id, agencyId) : await grantTool(tool.id, agencyId);
      if (!res.ok) return void toast.error(res.error);
      toast.success(on ? "Grant revoked" : "Tool granted");
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl">
      <Breadcrumbs items={[{ label: "Tools", href: "/tools" }, { label: tool.name }]} />
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight">{tool.name}</h1>
          <p className="mt-1 text-body text-zinc-500">{tool.description ?? ""}</p>
          <div className="mt-2 flex gap-2">
            <Badge value={tool.toolType} />
            <Badge value={tool.status} />
            {tool.usesStoreBridge && <Badge value="STORE_BRIDGE" />}
          </div>
        </div>
        {tool.status === "DRAFT" && (
          <button
            onClick={publish}
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AvailabilityMatrix productType="TOOL" productId={tool.id} agencies={agencies} initial={availability} />

        <Card className="p-5">
          <h2 className="font-semibold">Access grants</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Comp an agency access (no billing). Self-serve subscriptions arrive with P6.
          </p>
          <ul className="mt-4 divide-y divide-zinc-50">
            {agencies.map((a) => {
              const on = granted.has(a.id);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-2xs text-zinc-400">{on ? "granted access" : "no access"}</p>
                  </div>
                  {on ? (
                    <div className="flex items-center gap-2">
                      <Badge value="GRANTED" />
                      <button onClick={() => toggleGrant(a.id, true)} disabled={pending} className="text-xs font-medium text-zinc-400 hover:text-danger-600 disabled:opacity-50">
                        Revoke
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => toggleGrant(a.id, false)} disabled={pending} className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-50">
                      Grant access
                    </button>
                  )}
                </li>
              );
            })}
            {agencies.length === 0 && <li className="py-2.5 text-xs text-zinc-400">No active agencies yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
