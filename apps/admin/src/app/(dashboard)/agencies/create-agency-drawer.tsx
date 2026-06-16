"use client";

import { useState } from "react";
import { FX_APPS, FX_SETTINGS, formatRate } from "@nova/shared";
import { Badge, Mono } from "@/components/ui";
import { SlideOver, Field, TextInput, PrimaryButton, GhostButton } from "@/components/overlay";

/**
 * Admin-created agency in a drawer.
 * Wires to POST /v1/admin/agencies (spec: docs/03-modules/agencies.md, C2 2026-06-10).
 * Created agencies start ACTIVE; the owner receives an email invite.
 */
export function CreateAgencyDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [created, setCreated] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [defaultRate, setDefaultRate] = useState(String(FX_SETTINGS.defaultCommissionRateBps / 100));
  const [assignments, setAssignments] = useState<Record<string, { on: boolean; override: string }>>(
    Object.fromEntries(FX_APPS.map((a) => [a.slug, { on: false, override: "" }])),
  );

  const assigned = Object.entries(assignments).filter(([, v]) => v.on);
  const valid = name.length >= 2 && /^[a-z0-9][a-z0-9-]+$/.test(slug) && ownerEmail.includes("@") && assigned.length > 0;

  function reset() {
    setCreated(false); setName(""); setSlug(""); setOwnerEmail("");
    setDefaultRate(String(FX_SETTINGS.defaultCommissionRateBps / 100));
    setAssignments(Object.fromEntries(FX_APPS.map((a) => [a.slug, { on: false, override: "" }])));
  }

  function close() {
    onClose();
    if (created) reset();
  }

  return (
    <SlideOver
      open={open}
      onClose={close}
      title={created ? "Agency created" : "Create agency"}
      desc={created ? undefined : "Admin-created agencies start active. The owner receives an email invite."}
      footer={
        created ? (
          <PrimaryButton onClick={close}>Done</PrimaryButton>
        ) : (
          <>
            <GhostButton onClick={close}>Cancel</GhostButton>
            <PrimaryButton onClick={() => setCreated(true)} disabled={!valid}>
              Create agency &amp; send invite
            </PrimaryButton>
          </>
        )
      }
    >
      {created ? (
        <ul className="space-y-2 text-sm text-zinc-600">
          <li>✅ <strong>{name}</strong> created — status active (admin-created = pre-approved)</li>
          <li>✅ Dashboard: <Mono>{slug}.nova-apps.com</Mono></li>
          <li>✅ Default commission: {formatRate(Math.round(Number(defaultRate) * 100))}</li>
          <li>✅ {assigned.length} app(s) assigned{assigned.some(([, v]) => v.override) ? " (with overrides)" : ""}</li>
          <li>✉️ Invite sent to <strong>{ownerEmail}</strong> — owner sets password via link (Phase 2 mailer)</li>
        </ul>
      ) : (
        <div className="form-grid">
          <div className="form-row">
            <Field label="Agency name">
              <TextInput value={name}
                onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }}
                placeholder="Acme Digital" />
            </Field>
            <Field label="Subdomain">
              <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} className="mono text-xs" />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Owner email">
              <TextInput value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} type="email" placeholder="owner@agency.com" />
            </Field>
            <Field label="Default commission rate (%)" hint={`Platform default: ${formatRate(FX_SETTINGS.defaultCommissionRateBps)}`}>
              <TextInput value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} type="number" min="0" max="100" step="0.25" />
            </Field>
          </div>

          <Field label="Assigned apps" hint="The agency can only see and install assigned apps. Leave override empty to inherit the agency rate.">
            <div className="space-y-2">
              {FX_APPS.map((app) => {
                const a = assignments[app.slug];
                return (
                  <div key={app.slug} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors duration-150 ${a.on ? "border-zinc-900/20 bg-zinc-50" : "border-zinc-200"}`}>
                    <input type="checkbox" checked={a.on}
                      onChange={() => setAssignments((s) => ({ ...s, [app.slug]: { ...s[app.slug], on: !s[app.slug].on } }))}
                      className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-sm font-medium">{app.name}</span>
                      <Badge value={app.status} />
                    </div>
                    {a.on && (
                      <div className="flex items-center gap-1.5">
                        <TextInput value={a.override} placeholder={defaultRate}
                          onChange={(e) => setAssignments((s) => ({ ...s, [app.slug]: { ...s[app.slug], override: e.target.value } }))}
                          type="number" min="0" max="100" step="0.25" className="w-20 py-1 text-xs" />
                        <span className="whitespace-nowrap text-xs text-zinc-400">% {a.override ? "override" : "inherit"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Field>
        </div>
      )}
    </SlideOver>
  );
}
