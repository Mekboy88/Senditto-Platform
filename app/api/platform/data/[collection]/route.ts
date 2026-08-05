import { controlApi, json, sessionToken } from "../../../../auth";

/** Collections the product UI is allowed to work with. */
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

type Ctx = { params: Promise<{ collection: string }> };

async function forward(req: Request, collection: string, method: "GET" | "POST") {
  if (!ALLOWED.has(collection)) return json({ error: "Unknown collection" }, 404);
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  const body = method === "POST" ? await req.text() : undefined;
  try {
    const res = await fetch(`${controlApi()}/api/${collection}`, {
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

export async function GET(req: Request, ctx: Ctx) {
  return forward(req, (await ctx.params).collection, "GET");
}

export async function POST(req: Request, ctx: Ctx) {
  return forward(req, (await ctx.params).collection, "POST");
}
