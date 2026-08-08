import { controlApi, json, sessionToken } from "../../../../../auth";

/** What a template looks like with its fields filled in. */
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
    const res = await fetch(`${controlApi()}/api/templates/${encodeURIComponent(id)}/preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "Preview is temporarily unavailable." }, 503);
  }
}
