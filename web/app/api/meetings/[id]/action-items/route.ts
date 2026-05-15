import { NextRequest } from "next/server";
import { n8nFetch, N8nError } from "@/lib/n8n";
import { getSessionToken } from "@/lib/session";
import type { ActionItem } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) {
    return Response.json(
      { error: "invalid_session", message: "Please sign in." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_body", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    const res = await n8nFetch<{ actionItem: ActionItem }>(
      "actionItems.create",
      {
        method: "POST",
        id,
        body,
        sessionToken: token,
      }
    );
    return Response.json(res, { status: 201 });
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
