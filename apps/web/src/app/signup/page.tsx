"use client";

import { useState, type FormEvent } from "react";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ slug: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/agencies/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName: form.get("agencyName"),
          slug: form.get("slug"),
          ownerName: form.get("ownerName"),
          ownerEmail: form.get("ownerEmail"),
          password: form.get("password"),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          Array.isArray(body?.message) ? body.message.join(", ") : body?.message ?? "Signup failed",
        );
      }
      setDone({ slug: body.slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-bold tracking-tight">Application received 🎉</h1>
        <p className="mt-4 text-zinc-600">
          Your agency <strong>{done.slug}</strong> is pending approval. We&apos;ll email you
          when it&apos;s reviewed — your dashboard will be at{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm">{done.slug}.nova-apps.com</code>.
        </p>
      </main>
    );
  }

  const inputCls =
    "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-bold tracking-tight">Become a partner</h1>
      <p className="mt-2 text-zinc-600">
        Apply for the agency program. Approval usually takes 2 business days.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label htmlFor="agencyName" className="block text-sm font-medium">Agency name</label>
          <input id="agencyName" name="agencyName" required minLength={2} className={inputCls} />
        </div>
        <div>
          <label htmlFor="slug" className="block text-sm font-medium">Subdomain</label>
          <div className="mt-1 flex items-center">
            <input
              id="slug" name="slug" required minLength={3} pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
              placeholder="acme"
              className="w-full rounded-l-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <span className="rounded-r-md border border-l-0 border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
              .nova-apps.com
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Lowercase letters, numbers, hyphens. This becomes your dashboard address.</p>
        </div>
        <div>
          <label htmlFor="ownerName" className="block text-sm font-medium">Your name</label>
          <input id="ownerName" name="ownerName" required className={inputCls} />
        </div>
        <div>
          <label htmlFor="ownerEmail" className="block text-sm font-medium">Work email</label>
          <input id="ownerEmail" name="ownerEmail" type="email" required className={inputCls} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" required minLength={8} className={inputCls} />
        </div>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </main>
  );
}
