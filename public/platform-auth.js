/**
 * Senditto Platform — sign-in client.
 *
 * Talks only to this site's own /api/auth/* routes, which verify the account
 * against the Senditto control database server-side. The session lives in an
 * HttpOnly cookie, so no token is readable by page scripts, and nothing here
 * can grant access on its own: `verified` is set only after the database has
 * accepted the credentials.
 */
(() => {
  let verified = false;
  let profile = null;

  async function post(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Sign in failed");
    return data;
  }

  const SendittoAuth = {
    /** True only once the control database has accepted this visitor. */
    isAuthenticated: () => verified,
    user: () => profile,

    async signIn(email, password) {
      const data = await post("/api/auth/login", { email, password });
      verified = true;
      profile = data.user || { email };
      window.dispatchEvent(new CustomEvent("senditto:signed-in", { detail: profile }));
      return profile;
    },

    /** Restore a session left by a previous visit (cookie checked server-side). */
    async restore() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!res.ok) return null;
        const data = await res.json();
        verified = !!data.authenticated;
        profile = data.user || null;
        return verified ? profile : null;
      } catch {
        return null;
      }
    },

    async signOut() {
      verified = false;
      profile = null;
      try {
        await post("/api/auth/logout");
      } catch {
        /* cookie is cleared server-side regardless */
      }
      location.reload();
    },
  };

  window.SendittoAuth = SendittoAuth;
  SendittoAuth.restore();
})();
