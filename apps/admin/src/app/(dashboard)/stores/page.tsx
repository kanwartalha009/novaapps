import { listAdminStores } from "@/lib/api";
import { StoresClient } from "./stores-client";

/** Server component — fetches all connected stores (admin). */
export default async function StoresPage() {
  const { items } = await listAdminStores();
  return <StoresClient stores={items} />;
}
