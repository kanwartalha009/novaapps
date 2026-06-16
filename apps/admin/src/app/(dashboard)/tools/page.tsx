import { listTools } from "@/lib/api";
import { ToolsClient } from "./tools-client";

/** Server component — Tools registry (the Tool track, separate from Apps). */
export default async function ToolsPage() {
  const { items } = await listTools();
  return <ToolsClient tools={items} />;
}
