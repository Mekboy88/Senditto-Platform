import { controlApi, json, sessionToken } from "../../../../auth";

/**
 * Copy a library design into the workspace as a real template. The database
 * does the saving so the stored copy gets its plain-text alternative, passes
 * the sanitiser and is encrypted at rest.
 */
export async function POST(req: Request) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  try {
    const res = await fetch(`${controlApi()}/api/templates/from-library`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "Saving is temporarily unavailable." }, 503);
  }
}
