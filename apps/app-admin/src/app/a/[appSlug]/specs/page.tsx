"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import {
  resolveFxAppSpec, type FxAppSpec, type FxScreenSpec, type FxScreenSection,
  type FxSpecSurface, type FxSpecTemplate,
} from "@nova/shared";
import { getHostedApp } from "@/lib/apps-registry";
import { PageHeader, Badge, Card, Mono } from "@/components/ui";
import { SlideOver, Field, TextInput, TextArea, Select, PrimaryButton, GhostButton, SecondaryButton } from "@/components/overlay";

const SURFACES: { value: FxSpecSurface; label: string }[] = [
  { value: "app-home", label: "App Home (embedded admin)" },
  { value: "admin-ext", label: "Admin extension" },
  { value: "theme-ext", label: "Theme app extension" },
  { value: "checkout", label: "Checkout UI" },
  { value: "customer-accounts", label: "Customer accounts" },
  { value: "flow", label: "Flow" },
  { value: "pos", label: "POS" },
];
const TEMPLATES: FxSpecTemplate[] = ["homepage", "settings", "index", "detail", "wizard", "custom"];

/**
 * Screen-by-screen spec authoring — the app skeleton, defined per Polaris page
 * patterns (templates + compositions) so Claude Cowork can build each screen
 * from its spec. Wires to PATCH /v1/admin/engine/apps/:id/spec (Phase E).
 */
export default function SpecsPage({ params }: { params: Promise<{ appSlug: string }> }) {
  const { appSlug } = use(params);
  const { modules } = getHostedApp(appSlug);
  const [spec, setSpec] = useState<FxAppSpec>(() => resolveFxAppSpec(appSlug, modules));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const ready = spec.screens.filter((s) => s.status === "READY").length;
  const editing = spec.screens.find((s) => s.key === editingKey) ?? null;

  function patchScreen(key: string, patch: Partial<FxScreenSpec>) {
    setSpec((sp) => ({ ...sp, screens: sp.screens.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Screen specs"
        desc="The app skeleton, screen by screen — Polaris page patterns, sections, data, and acceptance criteria. The build pack pulls from here."
        action={<PrimaryButton onClick={() => setAdding(true)}>+ Add screen</PrimaryButton>}
      />

      <div className="mb-4 flex items-center gap-3 text-body text-zinc-500">
        <span><strong className="num text-zinc-900">{spec.screens.length}</strong> screens</span>
        <span className="text-zinc-300">·</span>
        <span><strong className="num text-zinc-900">{ready}</strong> ready</span>
        <span className="text-zinc-300">·</span>
        <span>{spec.screens.length - ready} draft</span>
      </div>

      <div className="space-y-3">
        {spec.screens.map((s) => (
          <Card key={s.key} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{s.name}</h2>
                  <Badge value={s.status} />
                  <span className="rounded-[4px] border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider text-zinc-500">
                    {s.surface}
                  </span>
                  <span className="text-2xs uppercase tracking-wider text-zinc-400">{s.template}</span>
                </div>
                <p className="mt-1 text-body text-zinc-500">{s.purpose}</p>
                <p className="mt-1.5"><Mono>{s.route}</Mono></p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {s.sections.map((sec) => (
                    <span key={sec.title} className="rounded-[4px] border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                      {sec.title} <span className="text-zinc-400">· {sec.composition}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <SecondaryButton className="btn-sm" onClick={() => setEditingKey(s.key)}>Edit spec</SecondaryButton>
                <span className="num text-2xs text-zinc-400">{s.acceptance.length} acceptance criteria</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <ScreenDrawer
          screen={editing}
          onClose={() => setEditingKey(null)}
          onChange={(patch) => patchScreen(editing.key, patch)}
        />
      )}
      <AddScreenDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(s) => setSpec((sp) => ({ ...sp, screens: [...sp.screens, s] }))}
      />
    </div>
  );
}

/* ── Edit drawer — full screen spec ─────────────────────────────── */
function ScreenDrawer({
  screen, onClose, onChange,
}: {
  screen: FxScreenSpec; onClose: () => void; onChange: (p: Partial<FxScreenSpec>) => void;
}) {
  function patchSection(i: number, patch: Partial<FxScreenSection>) {
    onChange({ sections: screen.sections.map((sec, j) => (j === i ? { ...sec, ...patch } : sec)) });
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      size="lg"
      title={`Spec: ${screen.name}`}
      desc={`${screen.surface} · ${screen.template} · saved to the app's blueprint`}
      footer={
        <>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <SecondaryButton onClick={() => onChange({ status: screen.status === "READY" ? "DRAFT" : "READY" })}>
            {screen.status === "READY" ? "Mark draft" : "Mark ready"}
          </SecondaryButton>
          <PrimaryButton onClick={onClose}>Save spec</PrimaryButton>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-row">
          <Field label="Screen name">
            <TextInput value={screen.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label={screen.surface === "app-home" ? "Route (React Router)" : "Target"}>
            <TextInput value={screen.route} onChange={(e) => onChange({ route: e.target.value })} className="mono text-xs" />
          </Field>
        </div>
        <Field label="Purpose">
          <TextArea rows={2} value={screen.purpose} onChange={(e) => onChange({ purpose: e.target.value })} />
        </Field>
        {screen.surface === "app-home" && (
          <Field label="Primary action (App Bridge title bar)" hint="Shown in the admin chrome above the page.">
            <TextInput value={screen.primaryAction ?? ""} onChange={(e) => onChange({ primaryAction: e.target.value })} />
          </Field>
        )}

        <h3 className="mt-2 font-semibold">Sections (Polaris compositions, in order)</h3>
        {screen.sections.map((sec, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-4">
            <div className="form-row">
              <Field label="Section title">
                <TextInput value={sec.title} onChange={(e) => patchSection(i, { title: e.target.value })} />
              </Field>
              <Field label="Composition" hint="setup-guide · data-table · form · stat-row · empty-state …">
                <TextInput value={sec.composition} onChange={(e) => patchSection(i, { composition: e.target.value })} className="mono text-xs" />
              </Field>
            </div>
            <Field label="Polaris components" hint="Comma-separated web components, e.g. s-section, s-data-table.">
              <TextInput
                value={sec.components.join(", ")}
                onChange={(e) => patchSection(i, { components: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
                className="mono text-xs"
              />
            </Field>
            <Field label="Content">
              <TextArea rows={2} value={sec.content} onChange={(e) => patchSection(i, { content: e.target.value })} />
            </Field>
            <Field label="Data" hint="App DB reads/writes + Admin GraphQL calls powering this section.">
              <TextInput value={sec.data ?? ""} onChange={(e) => patchSection(i, { data: e.target.value })} className="mono text-xs" />
            </Field>
            <button
              type="button"
              onClick={() => onChange({ sections: screen.sections.filter((_, j) => j !== i) })}
              className="text-xs text-zinc-400 hover:text-danger-600"
            >
              Remove section
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ sections: [...screen.sections, { title: "New section", composition: "form", components: ["s-section"], content: "" }] })}
          className="text-sm text-brand-600 hover:underline"
        >
          + Add section
        </button>

        <h3 className="mt-2 font-semibold">States</h3>
        <div className="form-row">
          <Field label="Empty state">
            <TextInput value={screen.emptyState ?? ""} onChange={(e) => onChange({ emptyState: e.target.value })} />
          </Field>
          <Field label="Loading state">
            <TextInput value={screen.loadingState ?? ""} onChange={(e) => onChange({ loadingState: e.target.value })} />
          </Field>
        </div>
        <Field label="Error state">
          <TextInput value={screen.errorState ?? ""} onChange={(e) => onChange({ errorState: e.target.value })} />
        </Field>

        <Field label="Acceptance criteria" hint="One per line — these become the checklist Cowork builds against.">
          <TextArea
            rows={4}
            value={screen.acceptance.join("\n")}
            onChange={(e) => onChange({ acceptance: e.target.value.split("\n").filter((l) => l.trim()) })}
          />
        </Field>
      </div>
    </SlideOver>
  );
}

/* ── Add drawer ─────────────────────────────────────────────────── */
function AddScreenDrawer({
  open, onClose, onAdd,
}: {
  open: boolean; onClose: () => void; onAdd: (s: FxScreenSpec) => void;
}) {
  const [name, setName] = useState("");
  const [surface, setSurface] = useState<FxSpecSurface>("app-home");
  const [template, setTemplate] = useState<FxSpecTemplate>("custom");
  const [route, setRoute] = useState("/app/");
  const [purpose, setPurpose] = useState("");

  function add() {
    onAdd({
      key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `screen-${Date.now()}`,
      name, surface, template, route, purpose,
      sections: [{ title: "Main", composition: "form", components: ["s-section"], content: "" }],
      acceptance: [],
      status: "DRAFT",
    });
    toast.success(`Screen "${name}" added to the blueprint`);
    setName(""); setRoute("/app/"); setPurpose("");
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Add screen"
      desc="Starts as a draft — open it to spec sections, data, and acceptance criteria."
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={add} disabled={name.length < 2}>Add screen</PrimaryButton>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Screen name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign builder" />
        </Field>
        <div className="form-row">
          <Field label="Surface">
            <Select value={surface} onChange={(e) => setSurface(e.target.value as FxSpecSurface)}>
              {SURFACES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Template" hint="Polaris page pattern.">
            <Select value={template} onChange={(e) => setTemplate(e.target.value as FxSpecTemplate)}>
              {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={surface === "app-home" ? "Route" : "Target"}>
          <TextInput value={route} onChange={(e) => setRoute(e.target.value)} className="mono text-xs" />
        </Field>
        <Field label="Purpose">
          <TextArea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What does this screen do for the merchant?" />
        </Field>
      </div>
    </SlideOver>
  );
}
