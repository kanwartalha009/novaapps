import Link from "next/link";
import { notFound } from "next/navigation";
import { PLACEHOLDER_APPS } from "@/lib/catalog";

export function generateStaticParams() {
  return PLACEHOLDER_APPS.map((a) => ({ slug: a.slug }));
}

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = PLACEHOLDER_APPS.find((a) => a.slug === slug);
  if (!app) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <Link href="/apps" className="text-sm text-brand-600 hover:text-brand-700">← All apps</Link>
      <div className="mt-4 flex items-center gap-3">
        <h1 className="font-bold tracking-tight">{app.name}</h1>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
          {app.pricingModel}
        </span>
      </div>
      <p className="mt-2 text-lg text-zinc-600">{app.tagline}</p>
      <p className="mt-6 max-w-2xl leading-7 text-zinc-700">{app.description}</p>

      <h2 className="mt-12 font-bold tracking-tight">Pricing</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {app.plans.map((plan) => (
          <div key={plan.name} className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-lg font-bold text-brand-600">{plan.price}</p>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
              {plan.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-brand-100 bg-brand-50 p-6">
        <h2 className="font-semibold text-brand-900">Agencies earn on this app</h2>
        <p className="mt-1 text-sm text-brand-700">
          Install {app.name} on client stores through your agency dashboard and earn
          recurring commission on every subscription payment.
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Become a partner
        </Link>
      </div>
    </main>
  );
}
