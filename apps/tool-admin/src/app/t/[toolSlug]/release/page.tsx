import { getTool, getChecklist } from "@/lib/api";
import { Card, Badge } from "@/components/ui";
import { NotConnected } from "@/components/shell-states";

export default async function ReleasePage({ params }: { params: Promise<{ toolSlug: string }> }) {
  const { toolSlug } = await params;
  const tool = await getTool(toolSlug);
  if (!tool) return <NotConnected slug={toolSlug} />;
  const data = await getChecklist(tool.id);
  const items = data?.checklist ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="font-semibold tracking-tight">Release</h1>
      <p className="mt-1 text-body text-zinc-500">Gate before publishing to agencies. Publish + grant happen in the platform admin Tools pillar.</p>
      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Checklist</h2>
          <Badge value={tool.status} />
        </div>
        <ul className="divide-y divide-zinc-50">
          {items.map((c) => (
            <li key={c.key} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={c.done ? "text-success-600" : "text-zinc-300"}>{c.done ? "✓" : "○"}</span>
              <span className={c.done ? "text-zinc-500 line-through" : "text-zinc-700"}>{c.label}</span>
            </li>
          ))}
          {items.length === 0 && <li className="py-2.5 text-sm text-zinc-400">No checklist.</li>}
        </ul>
        <p className="mt-3 text-2xs text-zinc-400">
          Toggle items via <code className="font-mono">PATCH /admin/tool-engine/tools/{tool.id}/checklist</code> (in-shell toggles are the next increment).
        </p>
      </Card>
    </div>
  );
}
