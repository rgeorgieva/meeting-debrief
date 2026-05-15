import { NextRequest } from "next/server";
import { n8nFetch, N8nError } from "@/lib/n8n";
import { setSessionCookie } from "@/lib/session";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
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
    const res = await n8nFetch<AuthResponse>("auth.signup", {
      method: "POST",
      body,
    });
    await setSessionCookie(res.sessionToken, res.expiresAt);
    return Response.json({ user: res.user }, { status: 200 });
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
