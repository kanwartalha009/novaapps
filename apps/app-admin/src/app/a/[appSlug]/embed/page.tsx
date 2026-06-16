import { notFound } from "next/navigation";
import { getHostedApp } from "@/lib/apps-registry";

/**
 * App Home — what the merchant sees embedded in Shopify admin (App Bridge iframe).
 * Public URL: [app-slug].nova-platform.localhost:3003/embed (no /apps/ prefix).
 * Phase 2: session token verification + Polaris UI + plan gating from AppPlan rows.
 */
export default async function AppHomeEmbed({ params }: { params: Promise<{ appSlug: string }> }) {
  const { appSlug } = await params;
  const hosted = getHostedApp(appSlug);
  if (!hosted) notFound();
  const { app } = hosted;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="card p-6">
        <p className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">
          App Home preview · renders inside Shopify admin
        </p>
        <h1 className="mt-2 font-semibold tracking-tight">{app.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">{app.tagline}</p>

        <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-body text-zinc-600">
          This is the merchant-facing surface for <strong>{app.name}</strong>. In production it
          loads inside the merchant's Shopify admin via App Bridge, authenticated by session
          token, with plan gating driven by the Nova plan registry.
        </div>

        <h2 className="mt-5 text-xs font-semibold uppercase tracking-widest text-zinc-400">Plans</h2>
        <ul className="mt-2 space-y-1 text-body text-zinc-600">
          {app.plans.map((p) => (
            <li key={p.name} className="flex justify-between">
              <span>{p.name}</span>
              <span className="num font-medium">
                {p.amount === 0 ? "Free" : `$${(p.amount / 100).toFixed(2)}/${p.interval === "ANNUAL" ? "yr" : "mo"}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
