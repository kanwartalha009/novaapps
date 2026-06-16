"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  FX_TICKETS, FX_TICKET_MESSAGES, FX_APPS, FX_INSTALLATIONS, FX_WEBHOOK_EVENTS,
} from "@nova/shared";
import { Badge, Card, Mono } from "@/components/ui";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

const AUTHOR_STYLE: Record<string, { label: string; bubble: string }> = {
  MERCHANT: { label: "Merchant", bubble: "bg-zinc-100 text-zinc-800" },
  BOT: { label: "🤖 Nova Bot", bubble: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200" },
  SUPPORT: { label: "Support", bubble: "bg-zinc-900 text-white" },
  AGENCY: { label: "Agency", bubble: "bg-zinc-100 text-zinc-700" },
};

/**
 * Ticket thread — chat with bot tier labeled (spec: support.md).
 * Wires to GET /v1/admin/support/tickets/:id + POST .../messages|resolve [support:write].
 */
export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ticket = FX_TICKETS.find((t) => t.id === id);
  const [messages, setMessages] = useState(FX_TICKET_MESSAGES.filter((m) => m.ticketId === id));
  const [status, setStatus] = useState(ticket?.status ?? "OPEN");
  const [draft, setDraft] = useState("");

  if (!ticket) {
    return <p className="text-sm text-zinc-400">Ticket not found. <Link className="text-brand-600 hover:underline" href="/support">Back to inbox</Link></p>;
  }

  const app = FX_APPS.find((a) => a.slug === ticket.appSlug);
  const install = FX_INSTALLATIONS.find((i) => i.appSlug === ticket.appSlug && i.shopDomain === ticket.shopDomain);
  const recentEvents = FX_WEBHOOK_EVENTS.filter((e) => e.appSlug === ticket.appSlug).slice(0, 3);

  function send() {
    if (!draft.trim()) return;
    setMessages((ms) => [...ms, { ticketId: id, author: "SUPPORT", body: draft, at: "2026-06-10 (now)" }]);
    setDraft("");
  }

  return (
    <div className="max-w-5xl">
      <Breadcrumbs items={[{ label: "Support inbox", href: "/support" }, { label: ticket.id }]} />
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight">{ticket.subject}</h1>
          <p className="mt-1 text-body text-zinc-500">
            {ticket.id} · {app?.name} · <Mono>{ticket.shopDomain}</Mono>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge value={status} />
          {status !== "RESOLVED" && (
            <button onClick={() => setStatus("RESOLVED")}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800">
              Resolve
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_290px]">
        {/* Thread */}
        <Card className="flex flex-col p-5">
          <div className="flex-1 space-y-4">
            {messages.map((m, i) => {
              const s = AUTHOR_STYLE[m.author];
              const right = m.author === "SUPPORT";
              return (
                <div key={i} className={`flex ${right ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%]">
                    <p className={`mb-1 text-2xs font-medium uppercase tracking-wide text-zinc-400 ${right ? "text-right" : ""}`}>
                      {s.label} · {m.at}
                    </p>
                    <div className={`rounded-xl px-3.5 py-2.5 text-sm leading-6 ${s.bubble}`}>{m.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {status !== "RESOLVED" ? (
            <div className="mt-5 flex gap-2 border-t border-zinc-100 pt-4">
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Reply as support…"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm" />
              <button onClick={send}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                Send
              </button>
            </div>
          ) : (
            <p className="mt-5 border-t border-zinc-100 pt-4 text-center text-xs text-zinc-400">Ticket resolved.</p>
          )}
        </Card>

        {/* Context sidebar — assembled automatically by the bot tier */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">App context</h2>
            <dl className="mt-2 space-y-1.5 text-body">
              <div className="flex justify-between"><dt className="text-zinc-500">App</dt><dd className="font-medium">{app?.name}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Plan</dt><dd>{install?.planName ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Install</dt><dd>{install ? <Badge value={install.status} /> : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Subscription</dt><dd>{install?.subscriptionStatus ? <Badge value={install.subscriptionStatus} /> : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Agency</dt><dd>{ticket.agencySlug ?? "direct"}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Priority</dt><dd>{ticket.priority}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Assignee</dt><dd>{ticket.assignee ?? "unassigned"}</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Recent webhook events (this app)
            </h2>
            <ul className="mt-2 space-y-2">
              {recentEvents.map((e) => (
                <li key={e.id} className="text-xs">
                  <Mono>{e.topic}</Mono>
                  <span className="ml-1.5 text-zinc-400">{e.createdAt}</span>
                  <Badge value={e.status} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-2xs text-zinc-400">
              Same appId key as tickets — context is one query at any scale.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
