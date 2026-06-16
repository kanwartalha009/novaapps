"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FX_TICKETS, FX_APPS, FX_AGENCY_APPS, FX_STORES } from "@nova/shared";
import { PageHeader, Badge, Table, Td, Mono } from "@/components/ui";
import { SlideOver, Field, TextInput, TextArea, Select, PrimaryButton, GhostButton } from "@/components/overlay";

const MY_AGENCY = "acme";

/** Agency support — app-scoped tickets. New tickets open in a slide-over form. */
export default function AgencySupportPage() {
  const myApps = FX_AGENCY_APPS.filter((x) => x.agencySlug === MY_AGENCY).map((x) => x.appSlug);
  const [appFilter, setAppFilter] = useState("all");
  const [panelOpen, setPanelOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState(false);

  const tickets = useMemo(
    () =>
      FX_TICKETS.filter((t) => t.agencySlug === MY_AGENCY)
        .filter((t) => (appFilter === "all" ? true : t.appSlug === appFilter))
        .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1)),
    [appFilter],
  );
  const open = FX_TICKETS.filter((t) => t.agencySlug === MY_AGENCY && t.status !== "RESOLVED").length;

  function submit() {
    setPanelOpen(false);
    setSubject("");
    setBody("");
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  return (
    <div>
      <PageHeader
        title="Support"
        desc={`Issues across your client stores — ${open} active. Basic questions are answered instantly by the automatic chat.`}
        action={
          <PrimaryButton onClick={() => setPanelOpen(true)} className="px-3.5">+ New ticket</PrimaryButton>
        }
      />

      {toast && (
        <p className="mb-4 rounded-md bg-success-50 px-3 py-2 text-xs font-medium text-success-600">
          ✓ Ticket submitted (demo) — the automatic chat is replying now.
        </p>
      )}

      <div className="mb-4 flex w-fit gap-1 rounded-lg bg-zinc-100 p-0.5">
        <button onClick={() => setAppFilter("all")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${appFilter === "all" ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
          All apps
        </button>
        {myApps.map((slug) => (
          <button key={slug} onClick={() => setAppFilter(slug)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${appFilter === slug ? "bg-white text-zinc-900" : "text-zinc-500"}`}>
            {FX_APPS.find((a) => a.slug === slug)?.name}
          </button>
        ))}
      </div>

      <Table head={["Ticket", "App", "Store", "Status", "Handled by", "Last activity"]}>
        {tickets.map((t) => (
          <tr key={t.id} className="hover:bg-zinc-100">
            <Td>
              <Link href={`/support/${t.id}`} className="font-medium text-brand-600 hover:underline">{t.subject}</Link>
            </Td>
            <Td className="text-xs font-medium">{FX_APPS.find((a) => a.slug === t.appSlug)?.name}</Td>
            <Td className="text-xs"><Mono>{t.shopDomain}</Mono></Td>
            <Td><Badge value={t.status} /></Td>
            <Td className="text-xs">{t.botHandled ? "🤖 automatic chat" : t.assignee ? `Nova · ${t.assignee}` : "Nova team"}</Td>
            <Td className="text-xs text-zinc-500">{t.lastActivityAt}</Td>
          </tr>
        ))}
      </Table>

      <SlideOver
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="New support ticket"
        desc="The automatic chat replies first and escalates to the Nova team when needed."
        footer={
          <>
            <GhostButton onClick={() => setPanelOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={submit} disabled={!subject.trim() || !body.trim()}>Submit ticket</PrimaryButton>
          </>
        }
      >
        <Field label="App">
          <Select defaultValue={myApps[0]}>
            {myApps.map((s) => <option key={s} value={s}>{FX_APPS.find((a) => a.slug === s)?.name}</option>)}
          </Select>
        </Field>
        <Field label="Store" hint="Only stores connected to your agency are listed.">
          <Select>
            {FX_STORES.filter((s) => s.agencySlug === MY_AGENCY).map((s) => (
              <option key={s.id} value={s.shopDomain}>{s.shopDomain}</option>
            ))}
          </Select>
        </Field>
        <Field label="Subject">
          <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary of the issue" />
        </Field>
        <Field label="Description" hint="Include what changed, when it started, and any error messages — the more context, the faster the resolution.">
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Describe the issue in detail…" />
        </Field>
        <Field label="Priority">
          <Select defaultValue="NORMAL">
            <option value="LOW">Low — question or minor issue</option>
            <option value="NORMAL">Normal — feature not working as expected</option>
            <option value="HIGH">High — impacting the merchant's sales</option>
            <option value="URGENT">Urgent — store-breaking problem</option>
          </Select>
        </Field>
      </SlideOver>
    </div>
  );
}
