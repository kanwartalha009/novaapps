"use client";

import { useState } from "react";

/** Dependency-free charts. Accent + neutrals; status colors only where semantic. */

const ACCENT = "#0C0A09";
const GRID = "#F5F5F4";

export const CHART_COLORS = {
  ACCENT,
  SUCCESS: "#15803D",
  DANGER: "#B91C1C",
  WARNING: "#B45309",
  MUTED: "#E7E5E4",
};

function fmt(v: number, kind: "money" | "number"): string {
  return kind === "money"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v / 100)
    : new Intl.NumberFormat("en-US").format(v);
}

export function AreaChart({
  data,
  height = 170,
  valueFormat = "money",
}: {
  data: { label: string; value: number }[];
  height?: number;
  valueFormat?: "money" | "number";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const PAD = 8;
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const x = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2 - 18);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;
  const last = data[data.length - 1];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Trend"
        onMouseMove={(e) => {
          const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - PAD) / (W - PAD * 2)) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.08" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={y(max * f)} y2={y(max * f)} stroke={GRID} strokeWidth="1" />
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD} y2={H - PAD} stroke="#D6D3D1" strokeWidth="1" strokeDasharray="3 3" />
        )}
        <circle
          cx={x(hover ?? data.length - 1)}
          cy={y(data[hover ?? data.length - 1].value)}
          r="3.5"
          fill={ACCENT}
        />
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1.5 text-2xs font-medium text-white"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          {data[hover].label} · <span className="num">{fmt(data[hover].value, valueFormat)}</span>
        </div>
      )}

      <div className="mt-1 flex justify-between px-1 text-2xs text-zinc-400">
        {data.filter((_, i) => i % 2 === 0).map((d) => <span key={d.label}>{d.label}</span>)}
      </div>
      <p className="mt-1 px-1 text-2xs text-zinc-400">
        Latest week: <span className="num font-semibold text-zinc-700">{fmt(last.value, valueFormat)}</span>
      </p>
    </div>
  );
}

/** Single accent color — trend direction is conveyed by the delta badge, not hue. */
export function Sparkline({ data }: { data: number[]; positive?: boolean }) {
  const W = 96, H = 32, PAD = 2;
  const max = Math.max(...data), min = Math.min(...data);
  const x = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / Math.max(1, max - min)) * (H - PAD * 2);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-24 shrink-0">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.08" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Delta pill for KPI cards: ▲ green tint / ▼ red tint / neutral. */
export function DeltaBadge({ text, direction }: { text: string; direction: "up" | "down" | "flat" }) {
  const cls =
    direction === "up"
      ? "bg-success-50 text-success-600"
      : direction === "down"
        ? "bg-danger-50 text-danger-600"
        : "bg-zinc-100 text-zinc-500";
  return (
    <span className={`num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {direction === "up" ? "▲" : direction === "down" ? "▼" : "–"} {text}
    </span>
  );
}

export function HBar({ value, max, color = "bg-zinc-900" }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-zinc-100">
      <div className={`h-1 rounded-full ${color}`} style={{ width: `${Math.max(2, (value / Math.max(1, max)) * 100)}%` }} />
    </div>
  );
}

export function Donut({
  segments,
  size = 120,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel: string;
  centerValue: string;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  let acc = 0;
  const stops = segments
    .map((s) => {
      const from = (acc / total) * 360;
      acc += s.value;
      const to = (acc / total) * 360;
      return `${s.color} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`;
    })
    .join(", ");
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0 rounded-full" style={{ width: size, height: size, background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-white">
          <span className="num text-xl font-semibold leading-none">{centerValue}</span>
          <span className="mt-0.5 text-2xs text-zinc-400">{centerLabel}</span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="dot" style={{ background: s.color }} />
            {s.label} <span className="num font-semibold text-zinc-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Skeleton shimmer block for loading states. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-100 ${className}`} />;
}
