import { controlApi, json, sessionToken } from "../../../../auth";

/**
 * The built-in design library. It lives on the database so the product and
 * the operator console show the same designs — a design improved in one place
 * is improved in both, rather than each carrying a copy that drifts.
 */
export async function GET(req: Request) {
  const token = sessionToken(req);
  if (!token) return json({ error: "Not signed in" }, 401);

  const brand = new URL(req.url).searchParams.get("brand");
  const query = brand ? `?brand=${encodeURIComponent(brand)}` : "";

  try {
    const res = await fetch(`${controlApi()}/api/templates/library${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return json(await res.json().catch(() => ({})), res.status);
  } catch {
    return json({ error: "The design library is temporarily unavailable." }, 503);
  }
}
