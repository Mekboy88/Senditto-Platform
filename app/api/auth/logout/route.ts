import {
  PROFILE_COOKIE,
  UI_HINT_COOKIE,
  SESSION_COOKIE,
  clearedCookieHeader,
  controlApi,
  isSecureRequest,
  sessionToken,
} from "../../../auth";

/** Sign out: revoke the session in the control database, then drop the cookies. */
export async function POST(req: Request) {
  const token = sessionToken(req);
  if (token) {
    try {
      await fetch(`${controlApi()}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* the cookies still go, below */
    }
  }

  const secure = isSecureRequest(req);
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  headers.append("Set-Cookie", clearedCookieHeader(SESSION_COOKIE, secure));
  headers.append("Set-Cookie", clearedCookieHeader(PROFILE_COOKIE, secure));
  headers.append("Set-Cookie", clearedCookieHeader(UI_HINT_COOKIE, secure));

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
