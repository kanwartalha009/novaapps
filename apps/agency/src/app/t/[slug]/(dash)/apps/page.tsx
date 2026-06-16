import { getCatalogApps, listStores } from "@/lib/api";
import { CatalogClient } from "./catalog-client";

/** Server component — catalog is availability-filtered server-side (ADR-011). */
export default async function CatalogPage() {
  const [apps, stores] = await Promise.all([getCatalogApps(), listStores()]);
  return <CatalogClient apps={apps} stores={stores} />;
}
