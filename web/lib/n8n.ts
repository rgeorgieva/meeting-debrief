// Single entry point for talking to the n8n backend.
// Handles the n8n quirk where webhook URLs with path parameters include
// the workflow's webhookId as a prefix, while parameterless ones do not.

const BASE = process.env.N8N_BASE_URL;

if (!BASE) {
  // Don't throw on import — Next.js may import this during build.
  // We'll throw at call time below.
}

type Operation =
  | "auth.signup"
  | "auth.login"
  | "auth.logout"
  | "auth.me"
  | "debrief"
  | "meetings.list"
  | "meetings.create"
  | "meetings.get"
  | "meetings.patch"
  | "meetings.delete"
  | "actionItems.create"
  | "actionItems.patch"
  | "actionItems.delete"
  | "actionItems.open";

// Map app operations → actual n8n webhook URLs (relative to N8N_BASE_URL).
// Operations on resources with :id parameters include the workflow webhookId
// prefix because n8n auto-adds it for uniqueness.
function buildPath(op: Operation, id?: string): string {
  switch (op) {
    case "auth.signup":
      return "/auth/signup";
    case "auth.login":
      return "/auth/login";
    case "auth.logout":
      return "/auth/logout";
    case "auth.me":
      return "/auth/me";
    case "debrief":
      return "/debrief";
    case "meetings.list":
      return "/meetings";
    case "meetings.create":
      return "/meetings";
    case "meetings.get":
      return `/meetings-get/meetings/${id}`;
    case "meetings.patch":
      return `/meetings-patch/meetings/${id}`;
    case "meetings.delete":
      return `/meetings-delete/meetings/${id}`;
    case "actionItems.create":
      return `/action-items-create/meetings/${id}/action-items`;
    case "actionItems.patch":
      return `/action-items-patch/action-items/${id}`;
    case "actionItems.delete":
      return `/action-items-delete/action-items/${id}`;
    case "actionItems.open":
      return "/action-items/open";
  }
}

export class N8nError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type FetchOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  sessionToken?: string | null;
  query?: Record<string, string | number | undefined>;
};

export async function n8nFetch<T = unknown>(
  op: Operation,
  opts: FetchOpts & { id?: string } = {}
): Promise<T> {
  if (!BASE) {
    throw new N8nError(
      500,
      "config_missing",
      "N8N_BASE_URL is not configured. Add it to .env.local."
    );
  }

  const path = buildPath(op, opts.id);
  const url = new URL(BASE.replace(/\/$/, "") + path);

  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // ngrok free tier sends a browser warning interstitial for "browser-like"
    // user agents — this header bypasses it for API calls.
    "ngrok-skip-browser-warning": "1",
  };

  if (opts.sessionToken) {
    headers["Authorization"] = `Bearer ${opts.sessionToken}`;
  }

  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    cache: "no-store",
  };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new N8nError(0, "network_error", msg);
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // non-JSON response from n8n; treat as error
      if (!res.ok) {
        throw new N8nError(res.status, "bad_response", text.slice(0, 200));
      }
    }
  }

  if (!res.ok) {
    const errObj = (parsed ?? {}) as { error?: string; message?: string };
    throw new N8nError(
      res.status,
      errObj.error ?? `http_${res.status}`,
      errObj.message ?? `Request failed with status ${res.status}`
    );
  }

  return parsed as T;
}
