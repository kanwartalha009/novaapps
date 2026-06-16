import type { Metadata } from "next";
import Link from "next/link";
import { PLACEHOLDER_APPS } from "@/lib/catalog";

export const metadata: Metadata = { title: "App catalog" };

export default function AppsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-bold tracking-tight">App catalog</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        Every app is published on the Shopify App Store and eligible for agency commission.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_APPS.map((app) => (
          <Link
            key={app.slug}
            href={`/apps/${app.slug}`}
            className="rounded-xl border border-zinc-200 bg-white p-6 transition hover:border-brand-500 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{app.name}</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-2xs font-semibold text-zinc-500">
                {app.pricingModel}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{app.tagline}</p>
            <p className="mt-4 text-sm font-medium text-brand-600">
              From {app.plans[0]?.price ?? "—"}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
