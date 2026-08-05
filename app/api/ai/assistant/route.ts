import { controlApi, json, sessionToken } from "../../../auth";

/**
 * The customer assistant. The session travels server-side, so the answer is
 * always scoped to the caller's own workspace — a customer can never ask about
 * anyone else's data.
 */
export async function POST(req: Request) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  let payload: { question?: string; workspaceId?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const question = String(payload.question || "").trim();
  if (!question) return json({ error: "Ask a question first" }, 422);

  try {
    const res = await fetch(`${controlApi()}/api/ai/assistant`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ question, workspaceId: payload.workspaceId ?? null }),
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "The assistant is temporarily unreachable." }, 503);
  }
}
