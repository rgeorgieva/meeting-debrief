import { n8nFetch, N8nError } from "@/lib/n8n";
import { getSessionToken } from "@/lib/session";
import type { OpenActionItem } from "@/lib/types";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return Response.json(
      { error: "invalid_session", message: "Please sign in." },
      { status: 401 }
    );
  }

  try {
    const res = await n8nFetch<{ items: OpenActionItem[] }>(
      "actionItems.open",
      { sessionToken: token }
    );
    return Response.json(res, { status: 200 });
  } catch (err) {
    if (err instanceof N8nError) {
      return Response.json(
        { error: err.code, message: err.message },
        { status: err.status || 500 }
      );
    }
    return Response.json(
      { error: "unknown", message: "Unexpected error" },
      { status: 500 }
    );
  }
}
