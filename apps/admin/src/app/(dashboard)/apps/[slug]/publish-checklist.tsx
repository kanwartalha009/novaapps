"use client";

import { useState } from "react";
import { FX_PUBLISH_CHECKLIST } from "@nova/shared";

/**
 * Manual publish steps (no Shopify API exists for these — spec: engine.md §4).
 * Demo: toggles local state; wires to PATCH /v1/admin/engine/apps/:id/checklist (Phase E).
 * The distribution step requires typed confirmation because it is IRREVERSIBLE on Shopify.
 */
export function PublishChecklist({ slug, initial }: { slug: string; initial: Record<string, boolean> }) {
  const [state, setState] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  function toggle(key: string) {
    if (key === "distribution" && !state[key]) {
      setConfirming(true);
      return;
    }
    setState((s) => ({ ...s, [key]: !s[key] }));
  }

  const done = Object.values(state).filter(Boolean).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Publish checklist</h2>
        <span className="text-xs text-zinc-400">{done}/{FX_PUBLISH_CHECKLIST.length}</span>
      </div>
      <ul className="space-y-2">
        {FX_PUBLISH_CHECKLIST.map((c) => (
          <li key={c.key} className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={!!state[c.key]}
              onChange={() => toggle(c.key)}
              disabled={c.automated}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900 disabled:opacity-60"
            />
            <div>
              <p className={`text-sm ${state[c.key] ? "text-zinc-400 line-through" : "font-medium"}`}>
                {c.label}
                {c.automated && (
                  <span className="ml-1.5 rounded-[4px] border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 align-middle text-2xs font-semibold uppercase tracking-wider text-zinc-500 no-underline">
                    engine
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-400">{c.manual}</p>
              {c.key === "distribution" && confirming && (
                <div className="mt-2 rounded-md border border-warning-300 bg-warning-50 p-3">
                  <p className="text-xs font-medium text-warning-700">
                    Distribution cannot be changed after selection. Type <code className="font-bold">{slug}</code> to confirm it was set in the Dev Dashboard.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      className="w-40 rounded border border-warning-300 px-2 py-1 text-xs"
                      placeholder={slug}
                    />
                    <button
                      disabled={typed !== slug}
                      onClick={() => { setState((s) => ({ ...s, distribution: true })); setConfirming(false); setTyped(""); }}
                      className="rounded bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Confirm
                    </button>
                    <button onClick={() => setConfirming(false)} className="text-xs text-zinc-500">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
