import { n8nFetch, N8nError } from "@/lib/n8n";
import { clearSessionCookie, getSessionToken } from "@/lib/session";

export async function POST() {
  const token = await getSessionToken();

  // Always clear cookie locally even if remote call fails.
  if (token) {
    try {
      await n8nFetch("auth.logout", {
        method: "POST",
        sessionToken: token,
      });
    } catch (err) {
      // Log but don't surface — logout is idempotent.
      if (err instanceof N8nError) {
        console.warn("Remote logout failed:", err.code);
      }
    }
  }

  await clearSessionCookie();
  return Response.json({ ok: true }, { status: 200 });
}
