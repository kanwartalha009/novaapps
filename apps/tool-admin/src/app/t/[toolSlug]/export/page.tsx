import { getTool, getBuildPack } from "@/lib/api";
import { Card } from "@/components/ui";
import { NotConnected } from "@/components/shell-states";

/** Build pack — the self-contained markdown doc to implement the tool's standalone repo from. */
export default async function BuildPackPage({ params }: { params: Promise<{ toolSlug: string }> }) {
  const { toolSlug } = await params;
  const tool = await getTool(toolSlug);
  if (!tool) return <NotConnected slug={toolSlug} />;
  const md = await getBuildPack(tool.id);

  return (
    <div className="max-w-3xl">
      <h1 className="font-semibold tracking-tight">Build pack</h1>
      <p className="mt-1 text-body text-zinc-500">
        Generated from the registry + blueprint. Clone <code className="font-mono text-xs">nova-tool-template</code> and implement from this.
      </p>
      <Card className="mt-4 p-5">
        {md ? (
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-zinc-700">{md}</pre>
        ) : (
          <p className="text-sm text-zinc-400">Build pack unavailable (sign in to the platform admin first).</p>
        )}
      </Card>
    </div>
  );
}
