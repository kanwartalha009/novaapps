import { getTool } from "@/lib/api";
import { Card, Badge } from "@/components/ui";
import { NotConnected } from "@/components/shell-states";

export default async function ToolOverview({ params }: { params: Promise<{ toolSlug: string }> }) {
  const { toolSlug } = await params;
  const tool = await getTool(toolSlug);
  if (!tool) return <NotConnected slug={toolSlug} />;

  const rows: [string, string][] = [
    ["Type", tool.toolType],
    ["Store Bridge", tool.usesStoreBridge ? "yes" : "no"],
    ["Required scopes", tool.requiredScopes.length ? tool.requiredScopes.join(", ") : "—"],
    ["Plans", String(tool.plans.length)],
    ["Latest version", tool.latestVersion ?? "—"],
    ["Repo", tool.repoUrl ?? "(create from nova-tool-template)"],
  ];

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="font-semibold tracking-tight">{tool.name}</h1>
        <p className="mt-1 text-body text-zinc-500">{tool.description ?? ""}</p>
        <div className="mt-2 flex gap-2"><Badge value={tool.status} /><Badge value={tool.toolType} /></div>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold">At a glance</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-zinc-50 py-1.5">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="truncate text-right font-medium text-zinc-800">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Next steps</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-600">
          <li>Author the <strong>Blueprint</strong> (screens + backend).</li>
          <li>Set <strong>Plans</strong>{tool.usesStoreBridge ? " and Store Bridge scopes" : ""}.</li>
          <li>Export the <strong>Build pack</strong> → implement the standalone repo from it.</li>
          <li>Work the <strong>Release</strong> checklist → publish + grant an agency.</li>
        </ol>
      </Card>
    </div>
  );
}
