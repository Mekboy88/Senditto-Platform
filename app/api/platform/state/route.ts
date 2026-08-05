import { controlApi, json, sessionToken } from "../../../auth";

/** Everything the signed-in account may see, straight from the control database. */
export async function GET(req: Request) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  try {
    const res = await fetch(`${controlApi()}/api/platform/state`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    return json(data, res.status);
  } catch {
    return json({ error: "The workspace is temporarily unreachable." }, 503);
  }
}
