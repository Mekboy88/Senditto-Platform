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
 * Sign in against the Senditto control database.
 * Credentials are checked by the database — this route never accepts an
 * account it cannot verify there.
 */
export async function POST(req: Request) {
  let email = "";
  let password = "";
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    email = String(body.email || "").trim();
    password = String(body.password || "");
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (!email || !password) {
    return json({ error: "Enter your email and password." }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${controlApi()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, purpose: "platform" }),
    });
  } catch {
    return json({ error: "Sign-in is temporarily unavailable. Please try again." }, 503);
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    token?: string;
    expiresAt?: string;
    user?: Record<string, unknown>;
    error?: string;
  };

  if (!upstream.ok || !data.token) {
    return json({ error: data.error || "Invalid email or password" }, upstream.status || 401);
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
    status: 200,
    headers,
  });
}
