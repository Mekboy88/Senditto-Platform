import {
  PROFILE_COOKIE,
  SESSION_COOKIE,
  UI_HINT_COOKIE,
  cookieHeader,
  controlApi,
  isSecureRequest,
  json,
} from "../../../auth";

/**
 * Create a real Senditto account. The account, its first workspace and the
 * session are all created in the control database — this route cannot invent
 * an account on its own.
 */
export async function POST(req: Request) {
  let payload: { email?: string; password?: string; name?: string; company?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const email = String(payload.email || "").trim();
  const password = String(payload.password || "");
  if (!email || !password) return json({ error: "Enter your email and a password." }, 400);
  if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 422);

  let upstream: Response;
  try {
    upstream = await fetch(`${controlApi()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: String(payload.name || "").trim(),
        company: String(payload.company || "").trim(),
        purpose: "platform",
      }),
    });
  } catch {
    return json({ error: "Sign-up is temporarily unavailable. Please try again." }, 503);
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    token?: string;
    expiresAt?: string;
    user?: Record<string, unknown>;
    error?: string;
  };

  if (!upstream.ok || !data.token) {
    return json({ error: data.error || "Could not create your account" }, upstream.status || 400);
  }

  const secure = isSecureRequest(req);
  const maxAge = data.expiresAt
    ? (new Date(data.expiresAt).getTime() - Date.now()) / 1000
    : 12 * 3600;
  const profile = JSON.stringify({
    email: data.user?.email ?? email,
    displayName: data.user?.display_name ?? "",
    role: data.user?.role ?? "",
  });

  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  headers.append("Set-Cookie", cookieHeader(SESSION_COOKIE, data.token, maxAge, secure));
  headers.append("Set-Cookie", cookieHeader(PROFILE_COOKIE, profile, maxAge, secure));
  headers.append("Set-Cookie", cookieHeader(UI_HINT_COOKIE, "1", maxAge, secure, false));

  return new Response(JSON.stringify({ ok: true, user: data.user ?? { email } }), {
    status: 201,
    headers,
  });
}
