"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import {
  resolveFxAppSpec, resolveFxAppDb,
  type FxAppSpec, type FxEntitySpec, type FxEndpointSpec, type FxWebhookSpec, type FxJobSpec,
} from "@nova/shared";
import { getHostedApp } from "@/lib/apps-registry";
import { PageHeader, Badge, Card, Table, Td, Mono } from "@/components/ui";
import { SlideOver, Field, TextInput, TextArea, Select, PrimaryButton, GhostButton, SecondaryButton } from "@/components/overlay";

/**
 * Backend spec — per-app Prisma data model, endpoints, webhook handlers, jobs.
 * Pairs with the screen specs; both feed the build pack Cowork pulls.
 * Wires to PATCH /v1/admin/engine/apps/:id/spec (Phase E).
 */
export default function BackendSpecPage({ params }: { params: Promise<{ appSlug: string }> }) {
  const { appSlug } = use(params);
  const { modules } = getHostedApp(appSlug);
  const db = resolveFxAppDb(appSlug);
  const [spec, setSpec] = useState<FxAppSpec>(() => resolveFxAppSpec(appSlug, modules));
  const [entity, setEntity] = useState<FxEntitySpec | null>(null);
  const [drawer, setDrawer] = useState<null | "entity" | "endpoint" | "webhook" | "job">(null);

  const b = spec.backend;
  const patch = (p: Partial<FxAppSpec["backend"]>) => setSpec((s) => ({ ...s, backend: { ...s.backend, ...p } }));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Backend"
        desc={`Data model and server behavior — schema lands at ${db.schemaPath}, stored as ${db.envVar}.`}
        action={<PrimaryButton onClick={() => setDrawer("entity")}>+ Add entity</PrimaryButton>}
      />

      <h2 className="mb-3 font-semibold">Data model (per-app Prisma)</h2>
      <Table head={["Entity", "Purpose", "Fields", "Relations", ""]}>
        {b.entities.map((e) => (
          <tr key={e.name} className="hover:bg-zinc-100">
            <Td><Mono>{e.name}</Mono></Td>
            <Td className="max-w-72 text-zinc-500">{e.purpose}</Td>
            <Td className="num">{e.fields.length}</Td>
            <Td className="text-xs text-zinc-500">{e.relations?.join(" · ") ?? "—"}</Td>
            <Td className="text-right">
              <button className="text-xs text-brand-600 hover:underline" onClick={() => setEntity(e)}>Fields</button>
            </Td>
          </tr>
        ))}
      </Table>

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="font-semibold">Endpoints</h2>
        <SecondaryButton className="btn-sm" onClick={() => setDrawer("endpoint")}>+ Add endpoint</SecondaryButton>
      </div>
      <Table head={["Method", "Path", "Purpose", "Auth", "Reads / writes"]}>
        {b.endpoints.map((e, i) => (
          <tr key={i} className="hover:bg-zinc-100">
            <Td><span className="text-xs font-semibold">{e.method}</span></Td>
            <Td><Mono>{e.path}</Mono></Td>
            <Td className="max-w-64 text-zinc-500">{e.purpose}</Td>
            <Td><Badge value={e.auth === "session-token" ? "ACTIVE" : e.auth === "webhook-hmac" ? "PENDING" : "DRAFT"} /></Td>
            <Td className="max-w-56 truncate text-xs text-zinc-500">{[e.reads && `R: ${e.reads}`, e.writes && `W: ${e.writes}`].filter(Boolean).join(" · ") || "—"}</Td>
          </tr>
        ))}
      </Table>
      <p className="mt-2 text-2xs text-zinc-400">
        Auth modes: session token (embedded App Home), webhook HMAC (X-Shopify-Hmac-Sha256), public (app proxy).
      </p>

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="font-semibold">Webhook handlers</h2>
        <SecondaryButton className="btn-sm" onClick={() => setDrawer("webhook")}>+ Add handler</SecondaryButton>
      </div>
      <Table head={["Topic", "Handler behavior", "Writes"]}>
        {b.webhooks.map((w, i) => (
          <tr key={i} className="hover:bg-zinc-100">
            <Td><Mono>{w.topic}</Mono></Td>
            <Td className="max-w-96 text-zinc-500">{w.handler}</Td>
            <Td className="text-xs text-zinc-500">{w.writes ?? "—"}</Td>
          </tr>
        ))}
      </Table>

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="font-semibold">Scheduled jobs</h2>
        <SecondaryButton className="btn-sm" onClick={() => setDrawer("job")}>+ Add job</SecondaryButton>
      </div>
      {b.jobs.length > 0 ? (
        <Table head={["Job", "Schedule", "Behavior"]}>
          {b.jobs.map((j) => (
            <tr key={j.name} className="hover:bg-zinc-100">
              <Td><Mono>{j.name}</Mono></Td>
              <Td className="text-xs text-zinc-500">{j.schedule}</Td>
              <Td className="max-w-96 text-zinc-500">{j.behavior}</Td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card className="p-5 text-body text-zinc-400">No scheduled jobs specced yet.</Card>
      )}

      <h2 className="mb-3 mt-6 font-semibold">Admin GraphQL usage</h2>
      <Card className="p-5">
        <div className="flex flex-wrap gap-1.5">
          {b.adminApi.length > 0 ? b.adminApi.map((a) => (
            <span key={a} className="rounded-[4px] border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">{a}</span>
          )) : <span className="text-body text-zinc-400">None specced — add the objects this app reads/writes; they drive OAuth scopes.</span>}
        </div>
      </Card>

      {/* Entity fields drawer */}
      {entity && (
        <SlideOver open onClose={() => setEntity(null)} title={`Entity: ${entity.name}`} desc={entity.purpose}
          footer={<PrimaryButton onClick={() => setEntity(null)}>Done</PrimaryButton>}>
          <Table head={["Field", "Type", "Required", "Note"]}>
            {entity.fields.map((f) => (
              <tr key={f.name}>
                <Td><Mono>{f.name}</Mono></Td>
                <Td className="text-xs">{f.type}</Td>
                <Td className="text-xs">{f.required ? "yes" : "no"}</Td>
                <Td className="text-xs text-zinc-500">{f.note ?? ""}</Td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-2xs text-zinc-400">
            Every shop-scoped table carries shopId — GDPR redact handlers purge by it.
          </p>
        </SlideOver>
      )}

      <AddDrawer kind={drawer} onClose={() => setDrawer(null)} backend={b} patch={patch} />
    </div>
  );
}

/* ── Add drawers (entity / endpoint / webhook / job) ───────────── */
function AddDrawer({
  kind, onClose, backend, patch,
}: {
  kind: null | "entity" | "endpoint" | "webhook" | "job";
  onClose: () => void;
  backend: FxAppSpec["backend"];
  patch: (p: Partial<FxAppSpec["backend"]>) => void;
}) {
  const [a, setA] = useState("");
  const [bb, setB] = useState("");
  const [c, setC] = useState("");
  const [method, setMethod] = useState<FxEndpointSpec["method"]>("GET");
  const [auth, setAuth] = useState<FxEndpointSpec["auth"]>("session-token");

  if (!kind) return null;

  function add() {
    if (kind === "entity") {
      const e: FxEntitySpec = {
        name: a, purpose: bb,
        fields: [
          { name: "id", type: "String @id @default(cuid())", required: true },
          { name: "shopId", type: "String", required: true, note: "shop-scoped (GDPR purge key)" },
        ],
      };
      patch({ entities: [...backend.entities, e] });
    } else if (kind === "endpoint") {
      const e: FxEndpointSpec = { method, path: a, purpose: bb, auth };
      patch({ endpoints: [...backend.endpoints, e] });
    } else if (kind === "webhook") {
      const w: FxWebhookSpec = { topic: a, handler: bb, writes: c || undefined };
      patch({ webhooks: [...backend.webhooks, w] });
    } else {
      const j: FxJobSpec = { name: a, schedule: bb, behavior: c };
      patch({ jobs: [...backend.jobs, j] });
    }
    const noun = kind === "entity" ? "Entity" : kind === "endpoint" ? "Endpoint" : kind === "webhook" ? "Webhook handler" : "Job";
    toast.success(`${noun} "${a}" added to the blueprint`);
    setA(""); setB(""); setC("");
    onClose();
  }

  const titles = { entity: "Add entity", endpoint: "Add endpoint", webhook: "Add webhook handler", job: "Add scheduled job" } as const;

  return (
    <SlideOver open onClose={onClose} title={titles[kind]}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={add} disabled={a.length < 2}>Add</PrimaryButton>
        </>
      }>
      <div className="form-grid">
        {kind === "endpoint" && (
          <div className="form-row">
            <Field label="Method">
              <Select value={method} onChange={(e) => setMethod(e.target.value as FxEndpointSpec["method"])}>
                {(["GET", "POST", "PATCH", "DELETE"] as const).map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Auth">
              <Select value={auth} onChange={(e) => setAuth(e.target.value as FxEndpointSpec["auth"])}>
                <option value="session-token">session-token (App Home)</option>
                <option value="webhook-hmac">webhook-hmac</option>
                <option value="public">public (app proxy)</option>
              </Select>
            </Field>
          </div>
        )}
        <Field label={kind === "entity" ? "Entity name" : kind === "endpoint" ? "Path" : kind === "webhook" ? "Topic" : "Job name"}>
          <TextInput value={a} onChange={(e) => setA(e.target.value)}
            placeholder={kind === "entity" ? "Campaign" : kind === "endpoint" ? "/app/campaigns (action)" : kind === "webhook" ? "orders/create" : "nightly-rollup"}
            className={kind === "entity" ? "" : "mono text-xs"} />
        </Field>
        <Field label={kind === "entity" ? "Purpose" : kind === "webhook" ? "Handler behavior" : kind === "job" ? "Schedule" : "Purpose"}>
          <TextArea rows={2} value={bb} onChange={(e) => setB(e.target.value)}
            placeholder={kind === "job" ? "daily 02:00 shop-local" : undefined} />
        </Field>
        {(kind === "webhook" || kind === "job") && (
          <Field label={kind === "webhook" ? "Writes (tables touched)" : "Behavior"}>
            <TextArea rows={2} value={c} onChange={(e) => setC(e.target.value)} />
          </Field>
        )}
        {kind === "entity" && (
          <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            id + shopId fields are added automatically; define the rest in the build pack review or extend here later.
          </p>
        )}
      </div>
    </SlideOver>
  );
}
