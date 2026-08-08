import { controlApi, json, sessionToken } from "../../../auth";

/**
 * Analytics for the signed-in account. The database computes the numbers and
 * scopes them to the caller's own workspaces, so the product and the operator
 * console can never report different figures for the same question.
 */
export async function GET(req: Request) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  const incoming = new URL(req.url);
  const params = new URLSearchParams();
  for (const key of ["days", "stream", "workspaceId"]) {
    const value = incoming.searchParams.get(key);
    if (value) params.set(key, value);
  }

  try {
    const res = await fetch(`${controlApi()}/api/analytics?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "Analytics are temporarily unavailable." }, 503);
  }
}
