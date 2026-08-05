import { controlApi, sessionToken } from "../../../auth";

/**
 * Live change feed. The browser holds an EventSource to this route; the
 * server holds the corresponding stream to the control database and pipes it
 * through, so the database is never addressed from the page.
 */
export async function GET(req: Request) {
  const token = sessionToken(req);
  if (!token) return new Response("Not signed in", { status: 401 });

  let upstream: Response;
  try {
    upstream = await fetch(`${controlApi()}/api/db/realtime`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      signal: req.signal,
    });
  } catch {
    return new Response("Stream unavailable", { status: 503 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Stream unavailable", { status: upstream.status || 503 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
