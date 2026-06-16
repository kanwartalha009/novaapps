import { notFound } from "next/navigation";
import { getAppBySlug, listAgencies, getAvailability } from "@/lib/api";
import { AppDetailClient } from "./app-detail-client";

/** App control center — server-fetches the real app + agencies + availability (P2). */
export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = await getAppBySlug(slug);
  if (!app) notFound();

  const [agencies, availability] = await Promise.all([
    listAgencies("ACTIVE"),
    getAvailability("APP", app.id),
  ]);

  return <AppDetailClient app={app} agencies={agencies} availability={availability} />;
}
