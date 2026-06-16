import Link from "next/link";
import { PLACEHOLDER_APPS } from "@/lib/catalog";

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center">
        <p className="mx-auto mb-4 w-fit rounded-md border border-zinc-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Agency partner program — earn on every install
        </p>
        <h1 className="mx-auto max-w-3xl font-bold tracking-tight">
          Shopify apps your clients need.
          <span className="text-brand-600"> Revenue you keep earning.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
          Nova Apps is a curated suite of Shopify apps with a built-in partner program.
          Agencies install apps for their clients and earn recurring commission on every
          subscription — calculated automatically, paid out on schedule.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Become a partner
          </Link>
          <Link
            href="/apps"
            className="rounded-md border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
          >
            Browse apps
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-zinc-100 bg-[#fafafa] py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-bold tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              ["1. Connect stores", "Add your client Shopify stores to your agency dashboard."],
              ["2. Install apps", "Pick from the catalog and install on any connected store. Attribution is locked to your agency."],
              ["3. Earn commission", "Every subscription payment generates commission automatically — track balances and payouts in real time."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-zinc-200 p-6">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured apps */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between">
            <h2 className="font-bold tracking-tight">The suite</h2>
            <Link href="/apps" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PLACEHOLDER_APPS.map((app) => (
              <Link
                key={app.slug}
                href={`/apps/${app.slug}`}
                className="rounded-xl border border-zinc-200 bg-white p-6 transition hover:border-brand-500 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{app.name}</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-2xs font-semibold text-zinc-500">
                    {app.pricingModel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{app.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
