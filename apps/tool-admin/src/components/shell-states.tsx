import { Card } from "@/components/ui";

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://admin.nova-apps.localhost:3001";

/** Shown when the platform API didn't return the tool (missing, or no admin session on this subdomain). */
export function NotConnected({ slug }: { slug: string }) {
  return (
    <Card className="mx-auto mt-12 max-w-lg p-6 text-center">
      <h2 className="font-semibold">Couldn&apos;t load &quot;{slug}&quot;</h2>
      <p className="mt-2 text-sm text-zinc-500">
        The tool wasn&apos;t found, or this subdomain has no admin session. Create + manage tools from the platform
        admin&apos;s{" "}
        <a href={`${ADMIN}/tools`} className="text-brand-600 hover:underline">Tools</a>{" "}
        pillar, and sign in there first (the Tool Shell reads the platform API with your admin session).
      </p>
    </Card>
  );
}
