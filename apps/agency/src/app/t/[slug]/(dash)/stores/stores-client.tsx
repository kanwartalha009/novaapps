"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StoreView } from "@/lib/api";
import { connectStore, disconnectStore } from "@/lib/actions";
import { PageHeader, Table, Td, Mono } from "@/components/ui";
import { SlideOver, Field, TextInput, PrimaryButton, GhostButton } from "@/components/overlay";

/** Stores list + connect/disconnect, wired to the API via server actions (Commit 6). */
export function StoresClient({ initialStores }: { initialStores: StoreView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function connect() {
    const shopDomain = domain.includes(".") ? domain : `${domain}.myshopify.com`;
    startTransition(async () => {
      const res = await connectStore({ shopDomain, name: name || undefined });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Connected ${shopDomain}`);
      setDomain("");
      setName("");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string, shopDomain: string) {
    startTransition(async () => {
      const res = await disconnectStore(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Disconnected ${shopDomain}`);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="Stores"
        desc="Client Shopify stores connected to your agency. Installing apps on these stores earns you commission."
        action={<PrimaryButton onClick={() => setOpen(true)} className="px-3.5">+ Connect store</PrimaryButton>}
      />

      <Table head={["Shop domain", "Name", "Connected", ""]}>
        {initialStores.map((s) => (
          <tr key={s.id} className="hover:bg-zinc-100">
            <Td><Mono>{s.shopDomain}</Mono></Td>
            <Td className="font-medium">{s.name ?? "—"}</Td>
            <Td className="text-xs text-zinc-500">{new Date(s.createdAt).toLocaleDateString()}</Td>
            <Td className="text-right">
              <button
                onClick={() => remove(s.id, s.shopDomain)}
                disabled={pending}
                className="text-xs text-zinc-400 hover:text-danger-600 disabled:opacity-50"
              >
                Disconnect
              </button>
            </Td>
          </tr>
        ))}
        {initialStores.length === 0 && (
          <tr>
            <Td className="text-zinc-400">No stores connected yet — connect your first client store.</Td>
            <Td>{""}</Td><Td>{""}</Td><Td>{""}</Td>
          </tr>
        )}
      </Table>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Connect a store"
        desc="Add a client store to your agency. Store Bridge / OAuth verification arrives in a later phase."
        footer={
          <>
            <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={connect} disabled={!domain.trim() || pending}>
              {pending ? "Connecting…" : "Connect store"}
            </PrimaryButton>
          </>
        }
      >
        <Field label="Shop domain" hint="The store's myshopify.com domain — e.g. velvet-thread.myshopify.com">
          <TextInput value={domain} onChange={(e) => setDomain(e.target.value.toLowerCase())} placeholder="your-store.myshopify.com" />
        </Field>
        <Field label="Display name" hint="Optional — how this store appears in your dashboard.">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Velvet Thread" />
        </Field>
      </SlideOver>
    </div>
  );
}
