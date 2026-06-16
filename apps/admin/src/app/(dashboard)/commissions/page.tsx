import { listCommissions, listAgencies } from "@/lib/api";
import { CommissionsClient } from "./commissions-client";

/** Server component — admin commissions ledger + agencies (for the manual-adjustment selector). */
export default async function CommissionsPage() {
  const [{ items }, agencies] = await Promise.all([listCommissions(), listAgencies()]);
  return <CommissionsClient rows={items} agencies={agencies} />;
}
