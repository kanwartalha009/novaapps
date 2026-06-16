import { notFound } from "next/navigation";
import { getToolBySlug, listAgencies, getAvailability, getToolGrants } from "@/lib/api";
import { ToolDetailClient } from "./tool-detail-client";

/** Tool control center — availability + grants (entitlements, P3). */
export default async function ToolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await getToolBySlug(slug);
  if (!tool) notFound();

  const [agencies, availability, grants] = await Promise.all([
    listAgencies("ACTIVE"),
    getAvailability("TOOL", tool.id),
    getToolGrants(tool.id),
  ]);

  return <ToolDetailClient tool={tool} agencies={agencies} availability={availability} grants={grants} />;
}
