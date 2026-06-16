import { listApps } from "@/lib/api";
import { AppsClient } from "./apps-client";

/** Server component — fetches the app registry. */
export default async function AppsPage() {
  const { items } = await listApps();
  return <AppsClient apps={items} />;
}
