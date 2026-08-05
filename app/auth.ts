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

export function cookieHeader(name: string, value: string, maxAgeSeconds: number, secure: boolean): string {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

export function clearedCookieHeader(name: string, secure: boolean): string {
  return cookieHeader(name, "", 0, secure);
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
 * Ask the control database whether this session token is still valid.
 * The database is the only authority: an expired or revoked token fails here
 * no matter what the browser sends.
 */
export async function verifySession(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${controlApi()}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
