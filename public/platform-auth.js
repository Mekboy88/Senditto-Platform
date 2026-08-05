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

  /**
   * A readable hint the server sets beside the session cookie. It lets the app
   * paint the dashboard immediately on a refresh instead of flashing the
   * marketing site while the session is confirmed. It grants nothing: the
   * HttpOnly session cookie is the only thing the server trusts, and if it
   * turns out to be gone we clear the hint and return to signed-out.
   */
  const hasHint = () => /(?:^|;\s*)senditto_ui=1(?:;|$)/.test(document.cookie);

  function clearHint() {
    document.cookie = "senditto_ui=; Path=/; Max-Age=0; SameSite=Lax";
  }

  /** Read synchronously, before React renders, so the first paint is right. */
  window.SendittoBoot = {
    view: () => (hasHint() ? "dashboard" : null),
    signedIn: hasHint,
  };

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

    /** Create a real account, then sign straight in. */
    async signUp({ email, password, name, company } = {}) {
      const data = await post("/api/auth/register", { email, password, name, company });
      verified = true;
      profile = data.user || { email };
      window.dispatchEvent(new CustomEvent("senditto:signed-in", { detail: profile }));
      return profile;
    },

    /**
     * Restore a session left by a previous visit. The cookie is checked
     * server-side, so a refresh keeps you signed in for as long as the session
     * is genuinely alive — and only that long.
     */
    async restore() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!res.ok) {
          // The hint outlived the session: drop it and return to signed-out
          // once, rather than leaving a dashboard that cannot load anything.
          if (hasHint()) {
            clearHint();
            if (!sessionStorage.getItem("senditto_session_expired")) {
              sessionStorage.setItem("senditto_session_expired", "1");
              location.reload();
            }
          }
          return null;
        }
        sessionStorage.removeItem("senditto_session_expired");
        const data = await res.json();
        verified = !!data.authenticated;
        profile = data.user || null;
        return verified ? profile : null;
      } catch {
        // A network blip must not sign anyone out.
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
