const ADMIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://admin.nova-apps.localhost:3001";

/** Host index — the Tool Shell is reached per-tool at [tool-slug].nova-tools.localhost:3004. */
export default function HostIndex() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-lg font-semibold tracking-tight">Nova Tool Shell</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Open a tool at <code className="font-mono text-xs">[tool-slug].nova-tools.localhost:3004</code> — the subdomain
        selects the tool. Create + grant tools from the platform admin&apos;s{" "}
        <a href={`${ADMIN}/tools`} className="text-brand-600 hover:underline">Tools</a> pillar.
      </p>
    </main>
  );
}
