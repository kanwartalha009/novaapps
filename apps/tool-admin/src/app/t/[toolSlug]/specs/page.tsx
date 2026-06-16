import { getTool, getSpec } from "@/lib/api";
import { Card } from "@/components/ui";
import { NotConnected } from "@/components/shell-states";

export default async function BlueprintPage({ params }: { params: Promise<{ toolSlug: string }> }) {
  const { toolSlug } = await params;
  const tool = await getTool(toolSlug);
  if (!tool) return <NotConnected slug={toolSlug} />;
  const spec = await getSpec(tool.id);

  return (
    <div className="max-w-3xl">
      <h1 className="font-semibold tracking-tight">Blueprint</h1>
      <p className="mt-1 text-body text-zinc-500">Screens + backend spec, authored before code and folded into the build pack.</p>
      <Card className="mt-4 p-5">
        {spec?.spec ? (
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-zinc-700">{JSON.stringify(spec.spec, null, 2)}</pre>
        ) : (
          <p className="text-sm text-zinc-400">
            No blueprint yet. Author it by PATCHing the spec to
            <code className="ml-1 font-mono text-xs">/admin/tool-engine/tools/{tool.id}/spec</code> (an in-shell editor is the next increment).
          </p>
        )}
      </Card>
    </div>
  );
}
