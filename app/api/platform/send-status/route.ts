import { controlApi, json, sessionToken } from "../../../auth";

/**
 * What sending can do for the signed-in account: whether delivery is
 * configured, which of their domains are verified, and the address they may
 * always send from. The database scopes it to the caller's own workspace.
 */
export async function GET(req: Request) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  const incoming = new URL(req.url);
  const workspaceId = incoming.searchParams.get("workspaceId");
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";

  try {
    const res = await fetch(`${controlApi()}/api/send/status${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "Sending status is temporarily unavailable." }, 503);
  }
}
