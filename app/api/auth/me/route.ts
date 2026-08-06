import {
  PROFILE_COOKIE,
  SESSION_COOKIE,
  UI_HINT_COOKIE,
  checkSession,
  clearedCookieHeader,
  cookieHeader,
  isSecureRequest,
  readCookie,
  sessionToken,
} from "../../../auth";

/**
 * Report whether the caller holds a live session, and slide the cookies
 * forward while doing it.
 *
 * The rule that matters: cookies are cleared ONLY when the database says the
 * token is genuinely not a session. If the database could not be reached, the
 * session is left exactly as it was and the caller is told so — anything else
 * turns a momentary hiccup into a permanent logout.
 */
export async function GET(req: Request) {
  const token = sessionToken(req);
  const check = await checkSession(token);
  const secure = isSecureRequest(req);
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });

  if (check.state === "unavailable") {
    // Keep every cookie. The client keeps showing the app; real data calls
    // will surface any genuine problem on their own.
    return new Response(
      JSON.stringify({ authenticated: null, reason: "verification_unavailable" }),
      { status: 503, headers }
    );
  }

  if (check.state === "invalid") {
    headers.append("Set-Cookie", clearedCookieHeader(SESSION_COOKIE, secure));
    headers.append("Set-Cookie", clearedCookieHeader(PROFILE_COOKIE, secure));
    headers.append("Set-Cookie", clearedCookieHeader(UI_HINT_COOKIE, secure));
    return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers });
  }

  const maxAge = check.expiresAt
    ? (new Date(check.expiresAt).getTime() - Date.now()) / 1000
    : 30 * 24 * 3600;

  let profile: unknown = null;
  try {
    profile = JSON.parse(readCookie(req, PROFILE_COOKIE) || "null");
  } catch {
    profile = null;
  }
  if (!profile && check.user) profile = check.user;

  headers.append("Set-Cookie", cookieHeader(SESSION_COOKIE, token as string, maxAge, secure));
  headers.append("Set-Cookie", cookieHeader(PROFILE_COOKIE, JSON.stringify(profile ?? {}), maxAge, secure));
  headers.append("Set-Cookie", cookieHeader(UI_HINT_COOKIE, "1", maxAge, secure, false));

  return new Response(
    JSON.stringify({ authenticated: true, user: profile, expiresAt: check.expiresAt }),
    { status: 200, headers }
  );
}
