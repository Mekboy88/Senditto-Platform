/**
 * Platform authentication against the Senditto control database.
 *
 * The browser only ever talks to this app's own /api/auth/* routes. The
 * control database is reached server-side over a private address that is
 * never sent to the client, so no database host, port or operator API is
 * exposed on the public site.
 */

export const SESSION_COOKIE = "senditto_session";
/** Display profile for the signed-in account. The session cookie remains the
 *  only thing that grants access; this is read for the UI greeting. */
export const PROFILE_COOKIE = "senditto_profile";
/** Readable by the page, on purpose: it lets the app render the dashboard on
 *  first paint instead of flashing the marketing site while the session is
 *  confirmed. It grants nothing — the HttpOnly session cookie is the only
 *  thing the server trusts. */
export const UI_HINT_COOKIE = "senditto_ui";

/** Private control-database address. Server-side only. */
export function controlApi(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const base = env?.SENDITTO_CONTROL_API || "http://127.0.0.1:5181";
  return base.replace(/\/$/, "");
}

export type PlatformUser = {
  id: string;
  email: string;
  display_name?: string;
  role?: string;
  status?: string;
};

/** Read a cookie from the request. */
export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export const sessionToken = (req: Request) => readCookie(req, SESSION_COOKIE);

export function cookieHeader(
  name: string,
  value: string,
  maxAgeSeconds: number,
  secure: boolean,
  httpOnly = true
): string {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    ...(httpOnly ? ["HttpOnly"] : []),
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

export function clearedCookieHeader(name: string, secure: boolean): string {
  return cookieHeader(name, "", 0, secure, name !== UI_HINT_COOKIE);
}

/** https in production, plain http for local development. */
export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/**
 * Ask the control database whether this session token is still valid, and how
 * long it is now good for. Reaching the database rolls the session forward, so
 * the returned expiry is the fresh one — the caller re-issues its cookies with
 * it, and an account in regular use is never signed out.
 */
/**
 * Three outcomes, and the difference matters more than anything else here:
 *
 *   valid       — the database confirmed the session.
 *   invalid     — the database said this token is not a session. Sign out.
 *   unavailable — we could not ask. This is NOT a signed-out state: the
 *                 session may be perfectly good. Treating it as signed out is
 *                 what turns a one-second hiccup (a restart, a slow response)
 *                 into a permanent logout, because the cookies get cleared.
 */
export type SessionState = "valid" | "invalid" | "unavailable";
export type SessionCheck = { state: SessionState; expiresAt?: string; user?: unknown };

export async function checkSession(token: string | null): Promise<SessionCheck> {
  if (!token) return { state: "invalid" };

  // A single blip should not cost anyone their session, so try more than once
  // before giving up — but never conclude "signed out" from a failure to ask.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${controlApi()}/api/auth/session`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = (await res.json()) as { expiresAt?: string; user?: unknown };
        return { state: "valid", expiresAt: data.expiresAt, user: data.user };
      }
      // Only the database saying "not a session" is a real sign-out.
      if (res.status === 401 || res.status === 403) return { state: "invalid" };
    } catch {
      /* unreachable or timed out — fall through and retry */
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
  }
  return { state: "unavailable" };
}

/** True only when the database positively confirmed the session. */
export async function verifySession(token: string | null): Promise<boolean> {
  return (await checkSession(token)).state === "valid";
}
