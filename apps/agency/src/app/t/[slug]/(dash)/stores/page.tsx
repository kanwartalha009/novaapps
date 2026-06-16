import { listStores } from "@/lib/api";
import { StoresClient } from "./stores-client";

/** Server component — fetches the agency's stores from the API (tenant from JWT, I-9). */
export default async function StoresPage() {
  const stores = await listStores();
  return <StoresClient initialStores={stores} />;
}
