// Cookie-backed session helpers. The cookie holds the opaque session token
// issued by the n8n auth workflows. We never store user info client-side.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { n8nFetch, N8nError } from "./n8n";
import type { User } from "./types";

const COOKIE_NAME = "session_token";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export async function setSessionCookie(token: string, expiresAt?: string) {
  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt ? new Date(expiresAt) : undefined,
    maxAge: expiresAt ? undefined : THIRTY_DAYS_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Server Component / Server Action helper.
 * Returns the current user or null. Calls n8n's /auth/me.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await n8nFetch<{ user: User }>("auth.me", {
      sessionToken: token,
    });
    return res.user;
  } catch (err) {
    if (err instanceof N8nError && err.status === 401) {
      return null;
    }
    // Don't swallow real errors (network down, etc.) — but for auth-guarded
    // pages we treat a failed lookup as "not logged in" so the user sees the
    // login screen instead of a crash.
    console.error("getCurrentUser failed:", err);
    return null;
  }
}

/**
 * Use in protected Server Components / layouts.
 * Redirects to /login if not authenticated.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
