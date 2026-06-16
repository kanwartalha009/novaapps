"use client";

import { use, useState } from "react";
import Link from "next/link";
import { FX_TICKETS, FX_TICKET_MESSAGES, FX_APPS } from "@nova/shared";
import { Badge, Card, Mono } from "@/components/ui";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

const AUTHOR_STYLE: Record<string, { label: string; bubble: string }> = {
  MERCHANT: { label: "Merchant", bubble: "bg-zinc-100 text-zinc-800" },
  BOT: { label: "🤖 Nova Bot", bubble: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200" },
  SUPPORT: { label: "Nova Support", bubble: "bg-zinc-900 text-white" },
  AGENCY: { label: "You (agency)", bubble: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200" },
};

/**
 * Agency view of a ticket — follow the conversation, add context as AGENCY.
 * Resolution stays with the Nova support team (spec: support.md — agencies are read+comment).
 */
export default function AgencyTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(params);
  const ticket = FX_TICKETS.find((t) => t.id === ticketId && t.agencySlug === "acme");
  const [messages, setMessages] = useState(FX_TICKET_MESSAGES.filter((m) => m.ticketId === ticketId));
  const [draft, setDraft] = useState("");

  if (!ticket) {
    return (
      <p className="text-sm text-zinc-400">
        Ticket not found. <Link className="text-brand-600 hover:underline" href="/support">Back to support</Link>
      </p>
    );
  }
  const app = FX_APPS.find((a) => a.slug === ticket.appSlug);

  function send() {
    if (!draft.trim()) return;
    setMessages((ms) => [...ms, { ticketId, author: "AGENCY", body: draft, at: "2026-06-10 (now)" }]);
    setDraft("");
  }

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ label: "Support", href: "/support" }, { label: ticket.id }]} />
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight">{ticket.subject}</h1>
          <p className="mt-1 text-body text-zinc-500">
            {app?.name} · <Mono>{ticket.shopDomain}</Mono>
          </p>
        </div>
        <Badge value={ticket.status} />
      </div>

      <Card className="mt-5 flex flex-col p-5">
        <div className="flex-1 space-y-4">
          {messages.map((m, i) => {
            const s = AUTHOR_STYLE[m.author];
            const right = m.author === "AGENCY";
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
        {ticket.status !== "RESOLVED" ? (
          <div className="mt-5 flex gap-2 border-t border-zinc-100 pt-4">
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Add context for the support team…"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm" />
            <button onClick={send}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
              Comment
            </button>
          </div>
        ) : (
          <p className="mt-5 border-t border-zinc-100 pt-4 text-center text-xs text-zinc-400">
            Resolved {ticket.botHandled ? "by the automatic chat" : "by the Nova support team"}.
          </p>
        )}
      </Card>
      <p className="mt-3 text-2xs text-zinc-400">
        Resolution is handled by Nova support — your comments are visible to the team and the merchant.
      </p>
    </div>
  );
}
