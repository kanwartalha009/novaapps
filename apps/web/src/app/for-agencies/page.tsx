import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "For agencies" };

export default function ForAgenciesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="font-bold tracking-tight">Build recurring revenue from work you already do</h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600">
        You already recommend apps to your Shopify clients. With Nova Apps, those
        recommendations become a revenue stream — attributed to your agency for the
        lifetime of the install.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {[
          ["Lifetime attribution", "Referral credit is locked at install time and never reassigned. Your commission survives plan changes and upgrades."],
          ["Automatic calculation", "Every Shopify subscription payment generates a commission entry automatically — no invoices, no spreadsheets."],
          ["Transparent ledger", "See every charge, commission, and payout in your dashboard. Export statements anytime."],
          ["Scheduled payouts", "Approved balances are paid out via bank transfer, Stripe, or PayPal once they clear the maturity window."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-zinc-200 bg-white p-8">
        <h2 className="font-bold tracking-tight">How payouts work</h2>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
          <li><strong className="text-zinc-900">1. Earn</strong> — a client store pays its app subscription; your commission is recorded instantly.</li>
          <li><strong className="text-zinc-900">2. Mature</strong> — commissions clear a short maturity window covering refund periods.</li>
          <li><strong className="text-zinc-900">3. Get paid</strong> — cleared balances are batched and released to your chosen payout method.</li>
        </ol>
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/signup"
          className="inline-block rounded-md bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Apply for the partner program
        </Link>
        <p className="mt-3 text-xs text-zinc-400">Applications are reviewed by our team, usually within 2 business days.</p>
      </div>
    </main>
  );
}
