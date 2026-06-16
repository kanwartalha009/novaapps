export default function NoTenantPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="font-bold tracking-tight">Nova Apps — Agency</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          No agency subdomain detected. Access your dashboard at{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
            [your-agency].nova-apps.localhost:3002
          </code>
        </p>
        <a
          href="http://nova-apps.localhost:3000/login"
          className="mt-5 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Find my agency
        </a>
      </div>
    </main>
  );
}
