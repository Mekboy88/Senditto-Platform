import {
  PROFILE_COOKIE,
  UI_HINT_COOKIE,
  isSecureRequest,
  readCookie,
  clearedCookieHeader,
  SESSION_COOKIE,
  sessionToken,
  verifySession,
} from "../../../auth";

/**
 * Report whether the caller holds a live session. The token is re-checked
 * against the control database on every call, so a revoked or expired
 * account stops working immediately.
 */
export async function GET(req: Request) {
  const token = sessionToken(req);
  const valid = await verifySession(token);

  if (!valid) {
    const secure = isSecureRequest(req);
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    headers.append("Set-Cookie", clearedCookieHeader(SESSION_COOKIE, secure));
    headers.append("Set-Cookie", clearedCookieHeader(PROFILE_COOKIE, secure));
  headers.append("Set-Cookie", clearedCookieHeader(UI_HINT_COOKIE, secure));
    return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers });
  }

  let user: unknown = null;
  try {
    user = JSON.parse(readCookie(req, PROFILE_COOKIE) || "null");
  } catch {
    user = null;
  }

  return new Response(JSON.stringify({ authenticated: true, user }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
