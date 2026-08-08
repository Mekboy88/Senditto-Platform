import { controlApi, json, sessionToken } from "../../../../auth";

/** Tags this workspace can target, with how many subscribed contacts each reaches. */
export async function GET(req: Request) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";

  try {
    const res = await fetch(`${controlApi()}/api/campaigns/audience-tags${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "That is temporarily unavailable." }, 503);
  }
}
