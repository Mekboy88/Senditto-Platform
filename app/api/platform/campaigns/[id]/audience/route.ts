import { controlApi, json, sessionToken } from "../../../../../auth";

/**
 * Who a campaign would reach, and what stands in the way of sending it. Asked
 * before the send so the count on the confirmation is the real one.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);
  const { id } = await ctx.params;

  try {
    const res = await fetch(`${controlApi()}/api/campaigns/${encodeURIComponent(id)}/audience`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "That is temporarily unavailable." }, 503);
  }
}
