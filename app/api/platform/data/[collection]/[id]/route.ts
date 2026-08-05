import { controlApi, json, sessionToken } from "../../../../../auth";

const ALLOWED = new Set([
  "workspaces",
  "domains",
  "keys",
  "messages",
  "suppressions",
  "contacts",
  "templates",
  "campaigns",
  "webhooks",
]);

type Ctx = { params: Promise<{ collection: string; id: string }> };

async function forward(req: Request, ctx: Ctx, method: "PATCH" | "DELETE") {
  const { collection, id } = await ctx.params;
  if (!ALLOWED.has(collection)) return json({ error: "Unknown collection" }, 404);
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  const body = method === "PATCH" ? await req.text() : undefined;
  try {
    const res = await fetch(`${controlApi()}/api/${collection}/${encodeURIComponent(id)}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "The workspace is temporarily unreachable." }, 503);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  return forward(req, ctx, "PATCH");
}

export async function DELETE(req: Request, ctx: Ctx) {
  return forward(req, ctx, "DELETE");
}
