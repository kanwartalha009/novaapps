import {
  FX_INSTALLATIONS, FX_CHARGES, FX_TICKETS, FX_WEBHOOK_EVENTS, FX_SHOPIFY_ORG, formatMoney,
} from "@nova/shared";
import { getHostedApp } from "@/lib/apps-registry";
import { PageHeader, Badge, Card, Stat, Table, Td, Mono } from "@/components/ui";

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://admin.nova-apps.localhost:3001";

/**
 * App dashboard — landing page of this app's own admin panel on
 * [slug].nova-platform.localhost:3003. This is the working surface for the app
 * after creation: setup progress, endpoints, modules, events, installs.
 */
export default async function AppOverviewPage({ params }: { params: Promise<{ appSlug: string }> }) {
  const { appSlug } = await params;
  const { app, engine, modules, db, origin } = getHostedApp(appSlug);

  const installs = FX_INSTALLATIONS.filter((i) => i.appSlug === appSlug);
  const active = installs.filter((i) => i.status === "ACTIVE").length;
  const mrr = FX_CHARGES.filter((c) => c.appSlug === appSlug && c.type === "SUBSCRIPTION" && c.occurredAt >= "2026-06-01")
    .reduce((s, c) => s + c.amount, 0);
  const openTickets = FX_TICKETS.filter((t) => t.appSlug === appSlug && t.status !== "RESOLVED").length;
  const events = FX_WEBHOOK_EVENTS.filter((e) => e.appSlug === appSlug).slice(0, 5);

  // Setup pipeline — drives the progress card. Engine-automated steps are done
  // at creation; the rest complete as the app is built out.
  const steps: { label: string; done: boolean; sub: string }[] = [
    { label: "Created in Shopify org", done: true, sub: `${FX_SHOPIFY_ORG.name} · app ID ${engine.shopifyAppId ?? "—"}` },
    { label: "Credentials captured", done: !!engine.clientIdMasked, sub: engine.clientIdMasked ?? "client_id pending from CLI" },
    { label: "Database connected", done: db.status === "CONNECTED", sub: db.status === "CONNECTED" ? `${db.migrations} migrations` : "configure in platform admin" },
    { label: "First deploy", done: !!engine.latestVersion, sub: engine.latestVersion ?? "CI: shopify app deploy" },
    { label: "Distribution + listing", done: !!engine.checklist.distribution && !!engine.checklist.listing, sub: "manual — Dev Dashboard" },
    { label: "Published", done: app.status === "PUBLISHED", sub: app.status === "PUBLISHED" ? "live on App Store" : "after review" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={app.name}
        desc={app.tagline}
        action={
          <div className="flex items-center gap-2">
            <Badge value={app.status} />
            <a
              href={`${ADMIN}/apps/${app.slug}`}
              className="btn btn-secondary btn-sm"
            >
              Platform settings ↗
            </a>
          </div>
        }
      />

      {/* Setup progress — the app's path from scaffold to published */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Setup progress</h2>
          <span className="num text-xs text-zinc-400">{doneCount}/{steps.length} complete</span>
        </div>
        <div className="mt-1 h-1 w-full rounded-full bg-zinc-100">
          <div className="h-1 rounded-full bg-zinc-900 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <ol className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-2xs font-bold ${
                  s.done ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-300"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <span>
                <span className={`block text-body ${s.done ? "font-medium" : "text-zinc-500"}`}>{s.label}</span>
                <span className="block truncate text-2xs text-zinc-400">{s.sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active installs" value={String(active)} hint={`${installs.length} lifetime`} />
        <Stat label="June subscription revenue" value={formatMoney(mrr)} />
        <Stat label="Open tickets" value={String(openTickets)} hint="handled in platform support" />
        <Stat
          label="Database"
          value={db.status === "CONNECTED" ? "Connected" : db.status === "MIGRATIONS_PENDING" ? "Pending" : "Not set"}
          hint={`${db.migrations} migrations · last ${db.lastMigratedAt ?? "—"}`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Endpoints (this subdomain)</h2>
          <dl className="mt-3 space-y-1.5 text-body">
            <div className="flex justify-between"><dt className="text-zinc-500">Panel</dt><dd><Mono>{origin}/</Mono></dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">App Home</dt><dd><Mono>{origin}/embed</Mono></dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">OAuth</dt><dd><Mono>{origin}/api/auth</Mono></dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Webhooks</dt><dd><Mono>{origin}/api/webhooks</Mono></dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Repository</dt><dd><Mono>{engine.repoUrl}</Mono></dd></div>
          </dl>
          <p className="mt-3 text-2xs text-zinc-400">
            No /apps/ prefix — the subdomain selects the app. These URLs live in shopify.app.toml.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Module manifest</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {modules.map((m) => (
              <span key={m} className="rounded-[4px] border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">{m}</span>
            ))}
          </div>
          <p className="mt-3 text-2xs text-zinc-400">
            Sidebar feature sections are generated from this manifest — created with the app, tied
            to the app. Add modules from the platform admin settings page.
          </p>
          <h3 className="mt-4 text-2xs font-semibold uppercase tracking-widest text-zinc-400">Database</h3>
          <dl className="mt-2 space-y-1.5 text-body">
            <div className="flex justify-between"><dt className="text-zinc-500">Schema</dt><dd><Mono>{db.schemaPath}</Mono></dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Env var</dt><dd><Mono>{db.envVar}</Mono></dd></div>
          </dl>
        </Card>
      </div>

      <h2 className="mb-3 mt-6 font-semibold">Recent webhook events</h2>
      <Table head={["Topic", "Shop", "Status", "Received"]}>
        {events.map((e) => (
          <tr key={e.id} className="hover:bg-zinc-100">
            <Td><Mono>{e.topic}</Mono></Td>
            <Td className="text-xs text-zinc-500">{e.shopDomain}</Td>
            <Td><Badge value={e.status} /></Td>
            <Td className="text-xs text-zinc-500">{e.createdAt}</Td>
          </tr>
        ))}
        {events.length === 0 && (
          <tr><Td className="text-zinc-400">No events yet — webhooks arrive at {origin}/api/webhooks once the app is installed</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>

      <h2 className="mb-3 mt-6 font-semibold">Installations</h2>
      <Table head={["Store", "Agency", "Plan", "Status", "Subscription"]}>
        {installs.map((i) => (
          <tr key={i.id} className="hover:bg-zinc-100">
            <Td><Mono>{i.shopDomain}</Mono></Td>
            <Td className="text-zinc-500">{i.agencySlug}</Td>
            <Td>
              {i.planName ?? "—"}
              {i.planOverride && (
                <span className="ml-1.5 rounded-[4px] bg-zinc-100 px-1.5 py-0.5 text-2xs font-semibold text-zinc-600" title={i.planOverride.reason}>
                  {i.planOverride.kind === "FREE"
                    ? "comped free"
                    : i.planOverride.kind === "PERCENT"
                      ? `−${(i.planOverride.value ?? 0) / 100}%`
                      : `$${((i.planOverride.value ?? 0) / 100).toFixed(0)}/mo`}
                </span>
              )}
            </Td>
            <Td><Badge value={i.status} /></Td>
            <Td>{i.subscriptionStatus ? <Badge value={i.subscriptionStatus} /> : <span className="text-xs text-zinc-400">free</span>}</Td>
          </tr>
        ))}
        {installs.length === 0 && (
          <tr><Td className="text-zinc-400">No installations yet — agencies install from their catalog once the app is assigned</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>
    </div>
  );
}
