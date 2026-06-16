import { listHostedApps, APP_HOST } from "@/lib/apps-registry";

/**
 * Host index (bare host only) — each app's admin panel lives on its own subdomain:
 * [app-slug].{APP_HOST}. Merchants and Shopify never hit this page.
 */
export default function HostIndexPage() {
  const apps = listHostedApps();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-semibold tracking-tight">Nova app backends</h1>
      <p className="mt-1 text-body text-zinc-500">
        One deployment, {apps.length} app subdomains on <code className="mono text-xs">*.{APP_HOST}</code>.
        Each subdomain serves only that app's admin panel, App Home, OAuth, and webhooks.
      </p>
      <ul className="mt-6 space-y-3">
        {apps.map(({ app, origin, db }) => (
          <li key={app.slug} className="card p-4">
            <div className="flex items-center justify-between">
              <a href={origin} className="text-sm font-semibold hover:underline">{app.name}</a>
              <span className={`rounded-md px-1.5 py-0.5 text-2xs font-medium ${app.status === "PUBLISHED" ? "bg-success-50 text-success-600" : "bg-zinc-100 text-zinc-500"}`}>
                {app.status.toLowerCase()}
              </span>
            </div>
            <dl className="mt-2 space-y-1 text-xs text-zinc-500">
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-zinc-400">Panel</dt><dd><code className="mono">{origin}/</code></dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-zinc-400">App Home</dt><dd><code className="mono">{origin}/embed</code></dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-zinc-400">OAuth</dt><dd><code className="mono">{origin}/api/auth</code></dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-zinc-400">Webhooks</dt><dd><code className="mono">{origin}/api/webhooks</code></dd></div>
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-zinc-400">Database</dt><dd>{db ? `${db.envVar} · ${db.status.replace(/_/g, " ").toLowerCase()}` : "—"}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </main>
  );
}
