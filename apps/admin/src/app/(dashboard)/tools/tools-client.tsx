"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ToolAdminView } from "@/lib/api";
import { createTool } from "@/lib/actions";
import { PageHeader, Badge, Table, Td } from "@/components/ui";
import { SlideOver, Field, TextInput, Select, PrimaryButton, GhostButton } from "@/components/overlay";

/** Tools registry (agency-paid software — separate track from Apps). */
export function ToolsClient({ tools }: { tools: ToolAdminView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [toolType, setToolType] = useState<"AGENCY" | "STORE" | "HYBRID">("AGENCY");
  const [usesBridge, setUsesBridge] = useState(false);

  function create() {
    startTransition(async () => {
      const res = await createTool({ name, slug, toolType, usesStoreBridge: usesBridge });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Tool "${name}" created`);
      setOpen(false);
      setName("");
      setSlug("");
      setToolType("AGENCY");
      setUsesBridge(false);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="Tools"
        desc="Agency-paid software (outreach, SEO, …). Licensed via Nova — separate from Shopify App Store apps."
        action={<PrimaryButton onClick={() => setOpen(true)} className="px-3.5">Create tool</PrimaryButton>}
      />
      <Table head={["Tool", "Type", "Store Bridge", "Status", "Plans", ""]}>
        {tools.map((t) => (
          <tr key={t.slug} className="hover:bg-zinc-100">
            <Td>
              <Link href={`/tools/${t.slug}`} className="font-medium text-brand-600 hover:text-brand-700">{t.name}</Link>
              <p className="text-xs text-zinc-400">{t.description ?? ""}</p>
            </Td>
            <Td><Badge value={t.toolType} /></Td>
            <Td className="text-xs">{t.usesStoreBridge ? "yes" : "—"}</Td>
            <Td><Badge value={t.status} /></Td>
            <Td className="num text-xs text-zinc-500">{t.plans.length}</Td>
            <Td className="text-right">
              <Link href={`/tools/${t.slug}`} className="text-xs text-brand-600 hover:underline">Manage</Link>
            </Td>
          </tr>
        ))}
        {tools.length === 0 && (
          <tr><Td className="text-zinc-400">No tools yet — create your first one.</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td><Td>{""}</Td></tr>
        )}
      </Table>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Create tool"
        desc="Type is fixed at creation. Store Bridge wiring + Stripe plans come in later phases."
        footer={
          <>
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={create} disabled={pending || name.length < 2 || !/^[a-z0-9][a-z0-9-]+$/.test(slug)}>
              {pending ? "Creating…" : "Create tool"}
            </PrimaryButton>
          </>
        }
      >
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
            }}
            placeholder="SEO Optimizer"
          />
        </Field>
        <Field label="Slug">
          <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} className="mono text-xs" />
        </Field>
        <Field label="Type" hint="AGENCY = agency-only · STORE = acts on stores · HYBRID = both (Store Bridge in P5).">
          <Select value={toolType} onChange={(e) => setToolType(e.target.value as "AGENCY" | "STORE" | "HYBRID")}>
            <option value="AGENCY">AGENCY</option>
            <option value="STORE">STORE</option>
            <option value="HYBRID">HYBRID</option>
          </Select>
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-body text-zinc-600">
          <input type="checkbox" checked={usesBridge} onChange={() => setUsesBridge(!usesBridge)} className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
          Uses the Store Bridge (store data access)
        </label>
      </SlideOver>
    </div>
  );
}
