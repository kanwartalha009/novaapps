"use client";

import { useState } from "react";
import { FX_APPS, FX_AGENCY_APPS, FX_SETTINGS, formatRate, activeInstallCount } from "@nova/shared";
import { Badge, Card, Mono } from "@/components/ui";

/**
 * Assignment manager — demo with local state.
 * Wires to GET/POST/DELETE /v1/admin/agencies/:id/apps (spec: agencies.md, C2 2026-06-10).
 */
export function AssignedApps({ agencySlug, agencyRateBps }: { agencySlug: string; agencyRateBps: number | null }) {
  const [rows, setRows] = useState(FX_AGENCY_APPS.filter((x) => x.agencySlug === agencySlug));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inheritRate = agencyRateBps ?? FX_SETTINGS.defaultCommissionRateBps;
  const unassigned = FX_APPS.filter((a) => !rows.some((r) => r.appSlug === a.slug));

  function setOverride(appSlug: string, value: string) {
    setRows((rs) => rs.map((r) => (r.appSlug === appSlug ? { ...r, rateBps: value === "" ? null : Math.round(Number(value) * 100) } : r)));
    setEditing(null);
    setDraft("");
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Assigned apps</h2>
        <span className="text-2xs text-zinc-400">inherit = {formatRate(inheritRate)} agency rate</span>
      </div>
      <ul className="mt-3 divide-y divide-zinc-50">
        {rows.map((r) => {
          const app = FX_APPS.find((a) => a.slug === r.appSlug);
          const effective = r.rateBps ?? inheritRate;
          const activeInstalls = activeInstallCount(r.appSlug, agencySlug);
          return (
            <li key={r.appSlug} className="flex items-center justify-between gap-2 py-2.5">
              <div>
                <p className="text-sm font-medium">{app?.name ?? r.appSlug}</p>
                <p className="text-2xs text-zinc-400">assigned {r.assignedAt}</p>
              </div>
              <div className="flex items-center gap-2">
                {editing === r.appSlug ? (
                  <span className="flex items-center gap-1.5">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} type="number" min="0" max="100" step="0.25"
                      placeholder={(inheritRate / 100).toString()}
                      className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-xs" />
                    <button onClick={() => setOverride(r.appSlug, draft)} className="rounded bg-zinc-900 px-2 py-1 text-2xs font-semibold text-white">Set</button>
                    <button onClick={() => setOverride(r.appSlug, "")} className="text-2xs text-zinc-500 hover:underline">Inherit</button>
                  </span>
                ) : (
                  <>
                    <span className="text-sm font-semibold">{formatRate(effective)}</span>
                    {r.rateBps != null ? <Badge value="OVERRIDE" /> : <span className="text-2xs text-zinc-400">inherit</span>}
                    <button onClick={() => { setEditing(r.appSlug); setDraft(r.rateBps != null ? String(r.rateBps / 100) : ""); }}
                      className="text-xs text-brand-600 hover:underline">Edit</button>
                    <button onClick={() => activeInstalls === 0 && setRows((rs) => rs.filter((x) => x.appSlug !== r.appSlug))}
                      disabled={activeInstalls > 0}
                      title={activeInstalls > 0 ? `${activeInstalls} active install${activeInstalls > 1 ? "s" : ""} — can't unassign until uninstalled` : undefined}
                      className="text-xs text-zinc-400 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-400">Unassign</button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="py-3 text-sm text-zinc-400">No apps assigned — this agency sees an empty catalog.</li>}
      </ul>
      {unassigned.length > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
          <select id={`assign-${agencySlug}`} className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs">
            {unassigned.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select>
          <button
            onClick={() => {
              const sel = (document.getElementById(`assign-${agencySlug}`) as HTMLSelectElement).value;
              setRows((rs) => [...rs, { agencySlug, appSlug: sel, rateBps: null, assignedAt: "2026-06-10" }]);
            }}
            className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800">
            + Assign
          </button>
          <p className="text-2xs text-zinc-400">New assignments inherit the agency rate (<Mono>rateBps = null</Mono>).</p>
        </div>
      )}
    </Card>
  );
}
