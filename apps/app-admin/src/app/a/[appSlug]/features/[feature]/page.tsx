import { notFound } from "next/navigation";
import { getHostedApp, MODULE_FEATURES } from "@/lib/apps-registry";
import { PageHeader, EmptyState, Mono } from "@/components/ui";

/**
 * Feature section — generated per app from its module manifest. Each app gets only
 * the sections its modules declare; real feature UIs are built here app by app,
 * backed by this app's own database.
 */
export default async function FeaturePage({
  params,
}: {
  params: Promise<{ appSlug: string; feature: string }>;
}) {
  const { appSlug, feature } = await params;
  const hosted = getHostedApp(appSlug);
  if (!hosted || !hosted.modules.includes(feature)) notFound();
  const meta = MODULE_FEATURES[feature];
  if (!meta) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader title={meta.label} desc={`${meta.desc} — ${hosted.app.name}`} />
      <EmptyState
        title={`${meta.label} workspace`}
        desc={`Scaffolded by the engine from the ${feature} module. Feature UI is built per app, reading and writing this app's own database (${hosted.db?.envVar ?? "DB not configured"}).`}
        action={<Mono>shopify/{appSlug}/prisma/schema.prisma</Mono>}
      />
    </div>
  );
}
