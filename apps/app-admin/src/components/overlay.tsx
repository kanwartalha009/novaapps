"use client";

import { useEffect, type ReactNode } from "react";

/* No blur, no shadow — flat scrim + bordered panels (brief). */
function Backdrop({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-40 bg-zinc-950/25" onClick={onClose} aria-hidden />;
}

function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // scroll lock
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

/** Modal — destructive confirmations and one-question prompts ONLY. >3 fields → Drawer. */
export function Modal({
  open, onClose, title, desc, children, footer,
}: {
  open: boolean; onClose: () => void; title: string; desc?: string;
  children: ReactNode; footer?: ReactNode;
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal>
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
            <div>
              <h2 className="font-semibold">{title}</h2>
              {desc && <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>}
            </div>
            <button onClick={onClose} className="rounded-[4px] p-1 text-zinc-400 transition-colors duration-[120ms] hover:bg-zinc-100 hover:text-zinc-700" aria-label="Close">✕</button>
          </div>
          <div className="px-6 py-6">{children}</div>
          {footer && <div className="form-actions border-t border-zinc-100 px-6 py-4" style={{ marginTop: 0 }}>{footer}</div>}
        </div>
      </div>
    </>
  );
}

/** Drawer — right-anchored slide-in for create/edit flows. sm ≈480px, lg = 50vw. */
export function SlideOver({
  open, onClose, title, desc, children, footer, size = "sm",
}: {
  open: boolean; onClose: () => void; title: string;
  desc?: string;
  children: ReactNode; footer?: ReactNode; size?: "sm" | "lg";
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <>
      <Backdrop onClose={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-zinc-200 bg-white"
        style={{ maxWidth: size === "lg" ? "50vw" : 480 }}
        role="dialog"
        aria-modal
      >
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="font-semibold">{title}</h2>
            {desc && <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>}
          </div>
          <button onClick={onClose} className="rounded-[4px] p-1 text-zinc-400 transition-colors duration-[120ms] hover:bg-zinc-100 hover:text-zinc-700" aria-label="Close">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">{footer}</div>
        )}
      </div>
    </>
  );
}

export const Drawer = SlideOver;

/* ── Form primitives (the form pattern from the brief) ────────── */

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field" style={{ marginBottom: 16 }}>
      <label className="field-label">{label}</label>
      {children}
      {error ? (
        <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

export const inputCls = "input";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`input resize-y ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className ?? ""}`} />;
}

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Loading" />
  );
}

export function PrimaryButton({
  loading, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`btn btn-primary min-w-24 disabled:opacity-40 ${props.className ?? ""}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn btn-ghost ${props.className ?? ""}`} />;
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn btn-secondary ${props.className ?? ""}`} />;
}

/* Stepper — numbered circles connected by a line. Current = accent, done = filled + check. */
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex items-center">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
          <span className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-2xs font-semibold transition-colors duration-[120ms] ${
                i < current
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : i === current
                    ? "border-zinc-900 text-zinc-900"
                    : "border-zinc-300 text-zinc-400"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </span>
            <span className={`whitespace-nowrap text-xs ${i === current ? "font-medium text-zinc-900" : "text-zinc-400"}`}>{s}</span>
          </span>
          {i < steps.length - 1 && <span className="mx-3 h-px flex-1 bg-zinc-200" />}
        </li>
      ))}
    </ol>
  );
}
