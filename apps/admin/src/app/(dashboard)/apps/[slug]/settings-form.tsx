"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FX_ENGINE_MODULES, FX_SHOPIFY_ORG, resolveFxApp, resolveFxEngineState } from "@nova/shared";
import { Card, Mono } from "@/components/ui";
import { Field, TextInput, Select, PrimaryButton, GhostButton } from "@/components/overlay";

const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? "nova-platform.localhost:3003";

/**
 * App settings — the canonical place where an app's configuration lives.
 * Wires to PATCH /v1/admin/apps/:id (general/credentials) — Phase 2/E.
 */
export function AppSettingsForm({ slug }: { slug: string }) {
  const app = resolveFxApp(slug); // synthesizes freshly created slugs (demo mode)
  const engine = resolveFxEngineState(slug);
  const origin = `http://${slug}.${APP_HOST}`;

  const [name, setName] = useState(app.name);
  const [tagline, setTagline] = useState(app.tagline);
  const [pricing, setPricing] = useState(app.pricingModel);
  const [description, setDescription] = useState(app.description ?? "");
  const [listingUrl, setListingUrl] = useState(app.listingUrl ?? "");
  const [supportEmail, setSupportEmail] = useState(app.supportEmail ?? `support+${app.slug}@nova-apps.dev`);
  const [iconUrl, setIconUrl] = useState(app.iconUrl ?? "");
  const [apiKey, setApiKey] = useState(app.apiKeyMasked);
  const [apiSecret, setApiSecret] = useState("••••••••••••••••");
  const [webhookSecret, setWebhookSecret] = useState("••••••••••••••••");
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    toast.success(`${name || app.name} settings saved`);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Card className="p-5">
        <h2 className="font-semibold">General</h2>
        <p className="mb-5 mt-0.5 text-xs text-zinc-500">Identity shown in catalogs and the App Store registry.</p>
        <Field label="App name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Tagline">
          <TextInput value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="Slug" hint="Permanent — drives the subdomain, webhook route, and DB env var.">
            <TextInput value={app.slug} disabled className="mono text-xs opacity-60" />
          </Field>
          <Field label="Pricing model">
            <Select value={pricing} onChange={(e) => setPricing(e.target.value as typeof pricing)}>
              <option value="FREE">Free</option>
              <option value="FREEMIUM">Freemium</option>
              <option value="PREMIUM">Premium</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">App details</h2>
        <p className="mb-5 mt-0.5 text-xs text-zinc-500">Public-facing content — catalogs, listing, and support bot answers.</p>
        <Field label="Description" hint="Used by the public catalog and the support bot.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="input resize-y"
            placeholder="What does this app do for merchants?"
          />
        </Field>
        <div className="form-row">
          <Field label="App Store listing URL">
            <TextInput value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="https://apps.shopify.com/…" className="mono text-xs" />
          </Field>
          <Field label="Support email" hint="Receives escalations from the support bot.">
            <TextInput value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} type="email" />
          </Field>
        </div>
        <Field label="Icon URL" hint="Square, 512×512 minimum.">
          <TextInput value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://…/icon.png" className="mono text-xs" />
        </Field>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Shopify credentials</h2>
        <p className="mb-3 mt-0.5 text-xs text-zinc-500">Created by the engine via Shopify CLI; stored encrypted, secrets are write-only.</p>
        <div className="mb-5 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-xs">
          <span className="text-zinc-500">Shopify org <strong className="text-zinc-700">{FX_SHOPIFY_ORG.name}</strong> (#{FX_SHOPIFY_ORG.id})</span>
          <span className="text-zinc-500">App ID <Mono>{engine.shopifyAppId ?? "pending"}</Mono></span>
        </div>
        <div className="form-row">
          <Field label="API key (client_id)">
            <TextInput value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="mono text-xs" />
          </Field>
          <Field label="API secret">
            <TextInput type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="mono text-xs" />
          </Field>
        </div>
        <Field label="Webhook secret" hint="Used to verify X-Shopify-Hmac-Sha256 on this app's webhook receiver.">
          <TextInput type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="mono text-xs" />
        </Field>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Hosting</h2>
        <p className="mb-4 mt-0.5 text-xs text-zinc-500">Generated by the engine — paste these into shopify.app.toml.</p>
        <dl className="space-y-1.5 text-body">
          <div className="flex justify-between">
            <dt className="text-zinc-500">App admin panel</dt>
            <dd><a href={origin} target="_blank" className="text-brand-600 hover:underline"><Mono>{slug}.{APP_HOST}</Mono> ↗</a></dd>
          </div>
          <div className="flex justify-between"><dt className="text-zinc-500">App Home (embed)</dt><dd><Mono>{origin}/embed</Mono></dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">OAuth</dt><dd><Mono>{origin}/api/auth</Mono></dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">Webhooks</dt><dd><Mono>{origin}/api/webhooks</Mono></dd></div>
          {engine && (
            <>
              <div className="flex justify-between"><dt className="text-zinc-500">Repository</dt><dd><Mono>{engine.repoUrl}</Mono></dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Latest version</dt><dd>{engine.latestVersion ?? "—"}</dd></div>
            </>
          )}
        </dl>
        {engine && (
          <>
            <h3 className="mt-4 text-2xs font-semibold uppercase tracking-widest text-zinc-400">Module manifest</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {engine.modules.map((m) => (
                <span key={m} className="rounded-[4px] border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                  {FX_ENGINE_MODULES.find((x) => x.key === m)?.label ?? m}
                </span>
              ))}
              <button type="button" className="text-xs text-brand-600 hover:underline">+ Add module</button>
            </div>
          </>
        )}
      </Card>

      <div className="form-actions">
        <GhostButton
          type="button"
          onClick={() => {
            setName(app.name); setTagline(app.tagline); setPricing(app.pricingModel);
            setDescription(app.description ?? ""); setListingUrl(app.listingUrl ?? ""); setIconUrl(app.iconUrl ?? "");
          }}
        >
          Cancel
        </GhostButton>
        <PrimaryButton type="submit">{saved ? "✓ Saved" : "Save changes"}</PrimaryButton>
      </div>
    </form>
  );
}
