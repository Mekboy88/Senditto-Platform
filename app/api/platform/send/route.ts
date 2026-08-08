import { controlApi, json, sessionToken } from "../../../auth";

/**
 * Send an email. This hands the message to the database's sending engine —
 * the same path that validates the address, honours the suppression list,
 * checks the sending domain, signs the message and records every delivery
 * event. There is no other way to send, so nothing can appear queued without
 * actually being queued.
 */
export async function POST(req: Request) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  try {
    const res = await fetch(`${controlApi()}/api/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "Sending is temporarily unavailable. Please try again." }, 503);
  }
}
