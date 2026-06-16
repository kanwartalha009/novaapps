import { cookies } from "next/headers";

/** Same-origin CSV proxy → forwards the auth cookie to the API (no CORS). */
const API_URL = process.env.API_PROXY_TARGET ?? "http://localhost:4000/v1";

export async function GET() {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${API_URL}/agencies/me/commissions/statement.csv`, {
    headers: { cookie },
    cache: "no-store",
  });
  const body = await res.text();
  return new Response(res.ok ? body : "error\n", {
    status: res.status,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=commissions.csv",
    },
  });
}
