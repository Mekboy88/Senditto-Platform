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
 * Report whether the caller holds a live session, and refresh the cookies
 * while doing it.
 *
 * The refresh is the point: the database rolls a session forward whenever it
 * is used, so re-issuing the cookies with the new expiry means an account in
 * regular use stays signed in indefinitely. Without this the cookie would
 * quietly lapse on its original deadline and the next refresh would look like
 * an unexplained logout.
 */
export async function GET(req: Request) {
  const token = sessionToken(req);
  const check = await checkSession(token);
  const secure = isSecureRequest(req);
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });

  if (!check.valid) {
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
