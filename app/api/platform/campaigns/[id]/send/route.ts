import { controlApi, json, sessionToken } from "../../../../../auth";

/**
 * Send a campaign. The database decides who it reaches, refuses a second send
 * to the same people, and holds it until its time if one was given — so the
 * product cannot mail a list twice by pressing a button twice.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  try {
    const res = await fetch(`${controlApi()}/api/campaigns/${encodeURIComponent(id)}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "Sending is temporarily unavailable. Please try again." }, 503);
  }
}
