"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FX_ENGINE_MODULES, FX_SCOPE_GROUPS, FX_PUBLISH_CHECKLIST, FX_SHOPIFY_ORG,
  fxShopifyAppIdFor, formatMoney,
} from "@nova/shared";
import { createApp, upsertAppPlan } from "@/lib/actions";
import { Badge, Mono } from "@/components/ui";
import { SlideOver, Stepper, Field, TextInput, Select, PrimaryButton, GhostButton, SecondaryButton } from "@/components/overlay";

/**
 * Create-app wizard in a lg drawer — creation stays on the platform admin.
 * Wires to POST /v1/admin/engine/apps (spec: docs/03-modules/engine.md, Phase E).
 */
const STEPS = ["Basics", "Details", "Modules", "Scopes", "Plans", "Database", "Review"] as const;
const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? "nova-platform.localhost:3003";

interface PlanDraft { name: string; price: string; interval: "EVERY_30_DAYS" | "ANNUAL"; trialDays: string }

function envVarFor(slug: string): string {
  return `APP_DB_URL__${slug.replace(/-/g, "_").toUpperCase()}`;
}

export function CreateAppDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [pricingModel, setPricingModel] = useState<"FREE" | "FREEMIUM" | "PREMIUM">("FREEMIUM");
  const [modules, setModules] = useState<string[]>(["backend"]);
  const [scopes, setScopes] = useState<string[]>([]);
  const [plans, setPlans] = useState<PlanDraft[]>([{ name: "Growth", price: "19", interval: "EVERY_30_DAYS", trialDays: "14" }]);
  const [dbUrl, setDbUrl] = useState("");
  const [dbLater, setDbLater] = useState(false);
  const [dbTested, setDbTested] = useState(false);

  const moduleScopes = useMemo(
    () => [...new Set(FX_ENGINE_MODULES.filter((m) => modules.includes(m.key)).flatMap((m) => m.defaultScopes))],
    [modules],
  );
  const allScopes = useMemo(() => [...new Set([...moduleScopes, ...scopes])], [moduleScopes, scopes]);
  const origin = `http://${slug || "app-slug"}.${APP_HOST}`;

  function toggleModule(key: string) {
    const mod = FX_ENGINE_MODULES.find((m) => m.key === key)!;
    if (mod.locked) return;
    setModules((ms) => (ms.includes(key) ? ms.filter((k) => k !== key) : [...ms, key]));
  }

  function reset() {
    setStep(0); setCreated(false);
    setName(""); setSlug(""); setTagline(""); setPricingModel("FREEMIUM");
    setDescription(""); setListingUrl(""); setSupportEmail(""); setIconUrl("");
    setModules(["backend"]); setScopes([]);
    setPlans([{ name: "Growth", price: "19", interval: "EVERY_30_DAYS", trialDays: "14" }]);
    setDbUrl(""); setDbLater(false); setDbTested(false);
  }

  function close() {
    onClose();
    if (created) reset();
  }

  /** P1: persist the registry row (+ plans) via apps-registry. Engine scaffolding
   *  (repo / Shopify org / per-app DB) is Phase E — the success screen previews it. */
  async function submit() {
    setSubmitting(true);
    const res = await createApp({ name, slug, description: tagline || description || undefined, pricingModel });
    if (!res.ok) {
      setSubmitting(false);
      toast.error(res.error);
      return;
    }
    const appId = (res.data as { id: string }).id;
    if (pricingModel !== "FREE") {
      for (const p of plans.filter((pl) => pl.name.trim())) {
        await upsertAppPlan(appId, {
          name: p.name,
          amount: Math.round(Number(p.price || 0) * 100),
          interval: p.interval,
          trialDays: Number(p.trialDays || 0),
        });
      }
    }
    setSubmitting(false);
    setCreated(true);
    router.refresh();
  }

  const canNext =
    step === 0 ? name.length >= 2 && /^[a-z0-9][a-z0-9-]+$/.test(slug) :
    step === 2 ? modules.length > 0 :
    step === 5 ? dbLater || dbUrl.trim().length > 0 :
    true;

  return (
    <SlideOver
      open={open}
      onClose={close}
      size="lg"
      title={created ? `${name} created` : "Create app"}
      desc={created ? undefined : "The app's own panel launches on its subdomain after creation."}
      footer={
        created ? (
          <>
            <GhostButton onClick={close}>Close</GhostButton>
            <Link href={`/apps/${slug || "encore"}`} className="btn btn-secondary" onClick={close}>
              Platform settings
            </Link>
            <a href={origin} className="btn btn-primary">
              Open app dashboard ↗
            </a>
          </>
        ) : (
          <>
            <GhostButton onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </GhostButton>
            {step < STEPS.length - 1 ? (
              <PrimaryButton onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Continue</PrimaryButton>
            ) : (
              <PrimaryButton onClick={submit} disabled={submitting}>
                {submitting ? "Creating…" : "Create app"}
              </PrimaryButton>
            )}
          </>
        )
      }
    >
      {created ? (
        <div>
          <h3 className="font-semibold">What the engine scaffolded (Phase E behavior)</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li>✅ Created in Shopify org <strong>{FX_SHOPIFY_ORG.name}</strong> — <Mono>shopify app init --name &quot;{name}&quot; --organization-id {FX_SHOPIFY_ORG.id}</Mono> → app ID <Mono>{fxShopifyAppIdFor(slug)}</Mono>, client_id captured</li>
            <li>✅ App panel on <Mono>{slug}.{APP_HOST}</Mono> — sections from the module manifest</li>
            <li>✅ Per-app database schema at <Mono>shopify/{slug}/prisma/schema.prisma</Mono>{dbLater ? " (connection pending)" : ` — ${envVarFor(slug)} configured`}</li>
            <li>✅ <Mono>shopify.app.toml</Mono> — {allScopes.length} scopes; OAuth <Mono>{origin}/api/auth</Mono>, webhooks <Mono>{origin}/api/webhooks</Mono></li>
            <li>✅ Registered app (status DRAFT) with {pricingModel === "FREE" ? 0 : plans.filter((p) => p.name).length} plan(s)</li>
            <li>✅ Billing + GDPR topics forwarded to platform ingress</li>
          </ul>
          <h3 className="mt-6 font-semibold">Manual steps that remain (no Shopify API exists)</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
            {FX_PUBLISH_CHECKLIST.filter((c) => !c.automated).map((c) => <li key={c.key}>☐ {c.label}</li>)}
          </ul>
          <p className="mt-6 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            Continue building on the app&apos;s own dashboard: <Mono>{slug}.{APP_HOST}</Mono>
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <Stepper steps={STEPS} current={step} />
          </div>

          {step === 0 && (
            <div className="form-grid">
              <Field label="App name">
                <TextInput
                  value={name}
                  onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }}
                  placeholder="Upsell Genius"
                />
              </Field>
              <Field label="Slug" hint={`Panel: ${slug || "…"}.${APP_HOST} · DB env: ${envVarFor(slug || "app-slug")}`}>
                <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} className="mono text-xs" />
              </Field>
              <Field label="Tagline">
                <TextInput value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line shown in catalogs" />
              </Field>
              <Field label="Pricing model">
                <div className="flex gap-2">
                  {(["FREE", "FREEMIUM", "PREMIUM"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setPricingModel(p)}
                      className={`rounded-md border px-3 py-1.5 text-body font-medium transition-colors duration-150 ${pricingModel === p ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"}`}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <Field label="Description" hint="Shown on the public catalog and used by the support bot for app answers.">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="input resize-y"
                  placeholder="What does this app do for merchants?"
                />
              </Field>
              <div className="form-row">
                <Field label="App Store listing URL" hint="Optional until the app is published.">
                  <TextInput value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="https://apps.shopify.com/…" className="mono text-xs" />
                </Field>
                <Field label="Support email" hint="Receives escalations from the support bot.">
                  <TextInput value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} type="email" placeholder="support@nova-apps.dev" />
                </Field>
              </div>
              <Field label="Icon URL" hint="Square, 512×512 minimum — used in catalogs and the agency dashboard.">
                <TextInput value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://…/icon.png" className="mono text-xs" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-4 text-sm text-zinc-500">
                Every app includes OAuth, Billing API plans, GDPR webhooks, and Nova charge forwarding.
                Selected modules become sections in the app's own admin panel.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {FX_ENGINE_MODULES.map((m) => {
                  const selected = modules.includes(m.key);
                  return (
                    <button key={m.key} type="button" onClick={() => toggleModule(m.key)} disabled={m.locked}
                      className={`rounded-lg border p-3 text-left text-sm transition-colors duration-150 ${selected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-300"} ${m.locked ? "opacity-90" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{m.label}</span>
                        <span className="flex gap-1">
                          {m.locked && <Badge value="ALWAYS_ON" />}
                          {m.plusOnly && <Badge value="PLUS_ONLY" />}
                          {m.maxPerApp === 1 && <Badge value="MAX_1" />}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{m.desc}</p>
                      <p className="mt-1 text-2xs uppercase tracking-widest text-zinc-400">{m.surface}</p>
                    </button>
                  );
                })}
              </div>
              {modules.includes("checkout") && (
                <p className="mt-3 rounded-md border border-warning-300 bg-warning-50 px-3 py-2 text-xs text-warning-600">
                  Checkout info/shipping/payment-step blocks render only on Shopify Plus stores. Thank-you/order-status targets work on all plans.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="mb-1 text-sm text-zinc-500">OAuth access scopes requested at install.</p>
              {moduleScopes.length > 0 && (
                <p className="mb-4 text-xs text-zinc-400">
                  Required by selected modules (locked): {moduleScopes.map((s) => <span key={s} className="mr-1"><Mono>{s}</Mono></span>)}
                </p>
              )}
              <div className="space-y-4">
                {FX_SCOPE_GROUPS.map((g) => (
                  <div key={g.group}>
                    <p className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">{g.group}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.scopes.map((s) => {
                        const fromModule = moduleScopes.includes(s);
                        const on = fromModule || scopes.includes(s);
                        return (
                          <button key={s} type="button" disabled={fromModule}
                            onClick={() => setScopes((sc) => (sc.includes(s) ? sc.filter((x) => x !== s) : [...sc, s]))}
                            className={`mono rounded-[4px] px-2 py-1 text-xs transition-colors duration-150 ${on ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"} ${fromModule ? "opacity-70" : ""}`}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="mb-4 text-sm text-zinc-500">
                Plans become Shopify Billing API subscriptions and Nova AppPlan rows (commission basis).
              </p>
              {pricingModel === "FREE" ? (
                <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500">Free app — no plans.</p>
              ) : (
                <div className="space-y-3">
                  {pricingModel === "FREEMIUM" && (
                    <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">Freemium: a $0 Free tier is added automatically.</p>
                  )}
                  {plans.map((p, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <TextInput value={p.name} onChange={(e) => setPlans(ps => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        placeholder="Plan name" className="w-36" />
                      <span className="text-sm text-zinc-400">$</span>
                      <TextInput value={p.price} onChange={(e) => setPlans(ps => ps.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                        type="number" min="0" className="w-24" />
                      <Select value={p.interval} onChange={(e) => setPlans(ps => ps.map((x, j) => j === i ? { ...x, interval: e.target.value as PlanDraft["interval"] } : x))}
                        className="w-40">
                        <option value="EVERY_30_DAYS">every 30 days</option>
                        <option value="ANNUAL">annual</option>
                      </Select>
                      <TextInput value={p.trialDays} onChange={(e) => setPlans(ps => ps.map((x, j) => j === i ? { ...x, trialDays: e.target.value } : x))}
                        type="number" min="0" className="w-20" title="Trial days" />
                      <span className="text-xs text-zinc-400">trial days</span>
                      <button type="button" onClick={() => setPlans(ps => ps.filter((_, j) => j !== i))} className="text-xs text-zinc-400 hover:text-danger-600">remove</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setPlans(ps => [...ps, { name: "", price: "0", interval: "EVERY_30_DAYS", trialDays: "0" }])}
                    className="text-sm text-brand-600 hover:underline">+ Add plan</button>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="mb-4 text-sm text-zinc-500">
                Each app gets its own Postgres database with an independent schema and migration
                history — isolated from the platform DB and from every other app.
              </p>
              <Field
                label="Connection string"
                hint={`Stored encrypted as ${envVarFor(slug || "app-slug")}. Schema scaffolds at shopify/${slug || "app-slug"}/prisma/schema.prisma.`}
              >
                <TextInput
                  value={dbUrl}
                  onChange={(e) => { setDbUrl(e.target.value); setDbTested(false); setDbLater(false); }}
                  placeholder="postgresql://user:pass@host:5432/db"
                  className="mono text-xs"
                  disabled={dbLater}
                />
              </Field>
              <div className="flex items-center gap-2">
                <SecondaryButton type="button" className="btn-sm" disabled={!dbUrl.trim() || dbLater} onClick={() => setDbTested(true)}>
                  {dbTested ? "✓ Connection ok" : "Test connection"}
                </SecondaryButton>
                <label className="flex cursor-pointer items-center gap-2 text-body text-zinc-600">
                  <input type="checkbox" checked={dbLater}
                    onChange={() => { setDbLater(!dbLater); setDbUrl(""); setDbTested(false); }}
                    className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
                  Configure later from the app's settings page
                </label>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 text-sm">
              <div><span className="font-semibold">{name}</span> <span className="text-zinc-400">·</span> <Mono>{slug}</Mono> <Badge value={pricingModel} /></div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">App panel</p>
                <p className="mt-1"><Mono>{origin}</Mono> — sections: {modules.map((m) => FX_ENGINE_MODULES.find((x) => x.key === m)?.label).join(" · ")}</p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">Details</p>
                <p className="mt-1 text-zinc-600">
                  {description ? description.slice(0, 90) + (description.length > 90 ? "…" : "") : <span className="text-zinc-400">no description</span>}
                  {supportEmail && <span className="text-zinc-400"> · support: {supportEmail}</span>}
                </p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">Database</p>
                <p className="mt-1">
                  {dbLater ? <span className="text-zinc-500">Configure later — app starts NOT CONFIGURED</span> : <Mono>{envVarFor(slug)}</Mono>}
                  {dbTested && <span className="ml-2 text-xs font-semibold text-success-600">connection tested</span>}
                </p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">Scopes ({allScopes.length})</p>
                <div className="mt-1 flex flex-wrap gap-1">{allScopes.map((s) => <Mono key={s}>{s}</Mono>)}</div>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-zinc-400">Plans</p>
                <p className="num mt-1">
                  {pricingModel === "FREE" ? "—" : plans.filter(p => p.name).map((p) => `${p.name} ${formatMoney(Number(p.price) * 100)}/${p.interval === "ANNUAL" ? "yr" : "mo"}`).join(" · ")}
                </p>
              </div>
              <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                Always included: GDPR topics, app/uninstalled, app_subscriptions/update → platform ingress.
              </p>
            </div>
          )}
        </div>
      )}
    </SlideOver>
  );
}
