import type { ReactNode } from "react";

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-zinc-200 pb-5">
      <div>
        <h1 className="font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        {desc && <p className="mt-1 max-w-2xl text-body text-zinc-500">{desc}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/* Status tags — sentence case, four variants only (brief: status colors used sparingly) */
const TAG_SUCCESS = new Set(["ACTIVE", "PUBLISHED", "PAID", "PROCESSED", "active"]);
const TAG_WARNING = new Set(["PENDING", "PENDING_APPROVAL", "WAITING_ON_MERCHANT", "pending", "frozen"]);
const TAG_DANGER = new Set(["FAILED", "REVERSED", "REVERSAL", "REFUND", "SUSPENDED", "declined"]);

function sentenceCase(v: string): string {
  const s = v.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Badge({ value }: { value: string }) {
  const cls = TAG_SUCCESS.has(value)
    ? "border-success-200 bg-success-50 text-success-600"
    : TAG_WARNING.has(value)
      ? "border-warning-300 bg-warning-50 text-warning-600"
      : TAG_DANGER.has(value)
        ? "border-danger-200 bg-danger-50 text-danger-600"
        : "border-zinc-200 bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] border px-2 py-[3px] text-xs font-medium leading-none ${cls}`}>
      {sentenceCase(value)}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(11,11,20,0.03)] ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="num mt-1.5 text-xl font-semibold tracking-tight text-zinc-900">{value}</p>
      {hint && <p className="mt-0.5 text-2xs text-zinc-400">{hint}</p>}
    </Card>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-zinc-200 text-left">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 text-2xs font-medium uppercase tracking-wider text-zinc-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </Card>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-zinc-700 ${className}`}>{children}</td>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="mono rounded-[4px] border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">{children}</code>;
}

/* Banner — in-page callout. info = border-only; warning/danger use status tokens. */
export function Banner({ variant = "info", children }: { variant?: "info" | "warning" | "danger"; children: ReactNode }) {
  const cls =
    variant === "warning"
      ? "border-warning-300 bg-warning-50 text-warning-600"
      : variant === "danger"
        ? "border-danger-200 bg-danger-50 text-danger-600"
        : "border-zinc-200 bg-white text-zinc-600";
  return <div className={`rounded-md border px-3.5 py-2.5 text-body ${cls}`}>{children}</div>;
}

/* EmptyState — shown when a route's primary collection is empty. */
export function EmptyState({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-3 text-zinc-300">{icon}</div>}
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-sm text-body text-zinc-500">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

/* Avatar — square initials, never circular. */
export function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-2xs font-semibold text-white">
      {initials}
    </span>
  );
}

/* Segmented — binary/ternary toggles. Border-driven, no pills. */
export function Segmented<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-[7px] border border-zinc-200 bg-zinc-100 p-0.5">
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors duration-[120ms] ${
            value === o ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(11,11,20,0.06)]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
