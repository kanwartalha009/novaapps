"use client";

import { useState, type FormEvent } from "react";

const AGENCY_HOST_SUFFIX = process.env.NEXT_PUBLIC_AGENCY_HOST ?? "nova-apps.localhost:3002";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://admin.nova-apps.localhost:3001";

export default function LoginRouterPage() {
  const [slug, setSlug] = useState("");

  function goToAgency(e: FormEvent) {
    e.preventDefault();
    if (!slug) return;
    const protocol = AGENCY_HOST_SUFFIX.includes("localhost") ? "http" : "https";
    window.location.href = `${protocol}://${slug}.${AGENCY_HOST_SUFFIX}/login`;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-24">
      <h1 className="text-center font-bold tracking-tight">Log in</h1>

      <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold">Agency partners</h2>
        <p className="mt-1 text-sm text-zinc-500">Enter your agency subdomain to reach your dashboard.</p>
        <form onSubmit={goToAgency} className="mt-4 flex">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="acme"
            pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
            required
            className="w-full rounded-l-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            className="rounded-r-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Go
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold">Platform admins</h2>
        <p className="mt-1 text-sm text-zinc-500">Operations console for the Nova Apps team.</p>
        <a
          href={`${ADMIN_URL}/login`}
          className="mt-4 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          Admin sign in →
        </a>
      </div>
    </main>
  );
}
