import { NextRequest } from "next/server";
import { n8nFetch, N8nError } from "@/lib/n8n";
import { getSessionToken } from "@/lib/session";
import type { MeetingsListResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return Response.json(
      { error: "invalid_session", message: "Please sign in." },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const limit = searchParams.get("limit") ?? undefined;
  const offset = searchParams.get("offset") ?? undefined;

  try {
    const res = await n8nFetch<MeetingsListResponse>("meetings.list", {
      sessionToken: token,
      query: { q, limit, offset },
    });
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

export async function POST(request: NextRequest) {
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
    const res = await n8nFetch<{ id: string }>("meetings.create", {
      method: "POST",
      body,
      sessionToken: token,
    });
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
